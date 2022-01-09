import express from "express";
import moment from "moment";
import axios from "axios";

import { AppState } from "../common/store";
import initialState from "../common/store/initial-state";
import {
  Global,
  ListStyle,
  Theme,
  LanguageSpec,
} from "../common/store/global/types";
import { activeUserMaker } from "../common/store/helper";
import site from "../common/constants/site.json";
import defaults from "../common/constants/defaults.json";
import config from "../config";
import { getSearchIndexCount, getDynamicProps } from "./helper";
import { getOperatingSystem } from "../common/util/platform";
import {
  getPrices,
  getScotDataAsync,
  HiveEngineTokenConfig,
  HiveEngineTokenInfo,
} from "../common/api/hive-engine";
import { LIQUID_TOKEN_UPPERCASE, HIVE_ENGINE_TOKENS } from "../client_config";
import { TokenPropertiesMap } from "../common/store/hive-engine-tokens/types";
import { langOptions } from "../common/i18n";
import { tokenAliases } from "../common/api/hive-engine";
const thirty_seconds = 30000;
const one_minute = 60000;
const five_minutes = 5 * one_minute;
const ten_minutes = 10 * one_minute;
let storedHiveEngineTokensProperties: TokenPropertiesMap = {
  "SWAP.HIVE": {
    hivePrice: 1,
  },

  VYB: {
    hivePrice: 0,
  },
};
let storedInfos: { [id: string]: HiveEngineTokenInfo } = {};
let storedConfigs: Array<HiveEngineTokenConfig> = [];
let storedPrices: { [id: string]: number } = {};
let fetchingPrices: boolean = false;
let lastStore: Date;
let search_requests_allowed: undefined | number = undefined;
const one_hundred_fifty_minutes = 15 * ten_minutes;

// the normal time between updates of Hive-Engine Properties
const hive_engine_token_properties_long_update_time = ten_minutes;

const fetch_search_requests_allowed = async (): void => {
  console.log("fetching search requests allowed...");
  if (process.env["SEARCH_API_ADDR"] && process.env["SEARCH_API_SECRET"]) {
    try {
      const SEP: Promise<{ data?: { message?: string } }> = axios.get(
        process.env["SEARCH_API_ADDR"] + "/state",
        { headers: { Authorization: process.env["SEARCH_API_SECRET"] } }
      );
      const r = await SEP;
      if (!r || !r.data) {
        search_requests_allowed = 0;
      } else if (r["data"]["message"]) {
        console.log(r.data.message);
        search_requests_allowed = 0;
      } else {
        search_requests_allowed =
          r.data["request_limit"] - r.data["request_count"];
      }
    } catch (e) {
      search_requests_allowed = 0;
      console.log("Exception thrown determining search count", e);
    }
  } else {
    search_requests_allowed = 0;
  }
  console.log(search_requests_allowed, "requests allowed.");
};

fetch_search_requests_allowed();
setInterval(fetch_search_requests_allowed, one_hundred_fifty_minutes);

let fetch_interval_handle: any = setInterval(() => {}, 1000000);
const fetch_hive_engine_token_information =
  async (): Promise<TokenPropertiesMap> => {
    let ret = storedHiveEngineTokensProperties;
    clearInterval(fetch_interval_handle);
    try {
      const token_names = HIVE_ENGINE_TOKENS.map((info) => info.apiName);
      const prices: { [id: string]: number } = await getPrices(token_names);
      const tokensInfos: { [coinname: string]: HiveEngineTokenInfo } =
        await getScotDataAsync<{ [coinname: string]: HiveEngineTokenInfo }>(
          "info",
          {}
        );

      const tokensConfigs: Array<HiveEngineTokenConfig> =
        await getScotDataAsync<Array<HiveEngineTokenConfig>>("config", {});

      for (const token of token_names) {
        if (token === "SWAP.HIVE" || token === "VYB") continue;
        try {
          const tokenInfos = await getScotDataAsync<HiveEngineTokenInfo>(
            "info",
            {
              token,
            }
          );

          const tokenConfigs = await getScotDataAsync<HiveEngineTokenConfig>(
            "config",
            { token }
          );

          tokensInfos[token] = tokenInfos;
          tokensConfigs.push(tokenConfigs);
        } catch (e) {
          console.log("Unable to get parameters for token:", token);
        }
      } // for

      if (tokensInfos && tokensConfigs && prices) {
        for (const config of tokensConfigs) {
          const token = config.token;
          if (!tokensInfos[token] || !prices[token]) {
            console.log("Cannot get info or price for ", token);
            continue;
          }
          ret[token] = {
            info: tokensInfos[token],
            config,
            hivePrice: prices[token],
            aliases: tokenAliases[token],
          };
        }
        storedHiveEngineTokensProperties = {
          ...storedHiveEngineTokensProperties,
          ...ret,
        };
        if (ret[LIQUID_TOKEN_UPPERCASE]) {
          console.log(
            new Date(),
            "scheduling next token property update for",
            hive_engine_token_properties_long_update_time / one_minute,
            "minutes from now"
          );
          fetch_interval_handle = setInterval(
            fetch_hive_engine_token_information,
            hive_engine_token_properties_long_update_time
          );
        } else {
          console.log(
            new Date(),
            "scheduling next token property update for thirty seconds from now"
          );
          fetch_interval_handle = setInterval(
            fetch_hive_engine_token_information,
            thirty_seconds
          );
        }
        console.log(
          new Date(),
          "Success loading HiveEngine Tokens Properties from API"
        );
      }
    } catch (e) {
      console.log(
        new Date(),
        "scheduling next token property update for thirty seconds from now"
      );
      fetch_interval_handle = setInterval(
        fetch_hive_engine_token_information,
        thirty_seconds
      );
    }
    return storedHiveEngineTokensProperties;
  };

// The interval call wont wait the whole ten minutes, but it wont execute the fetch immediately either.
// Prices do change throughout the day and it is better to have the data ready before some client makes a request.
// So it is important to setup the Interval here and the explicit call here.

let loadingHiveTokenInformation: boolean = false;
if (!loadingHiveTokenInformation) {
  loadingHiveTokenInformation = true;
  console.log("Calling FETCH");
  fetch_hive_engine_token_information().then((x: TokenPropertiesMap) => {
    console.log("FETCH call succeeded");
    loadingHiveTokenInformation = false;
  });
}

export const makePreloadedState = async (
  req: express.Request
): Promise<AppState> => {
  /* 
  
  req.headers['accept-language'] is the accept-language header which looks like
  the following:
  
  'en,en-US;q=0.9,es-AR;q=0.8,es;q=0.7'
  
  Although Brave sorts this in decending order, this is not a standard behavior.
  So it must be sorted here.
  
  */

  const headers = (req && { ...req.headers }) || {};
  const userAgent = (headers["user-agent"] || "").slice(0);
  const acceptableLanguage: { [languageCode: string]: boolean } = {
    en: true,
    "en-US": true,
  };
  const negotiatedLanguages: Array<string> = ["en-US"];
  const acceptLanguage = [{ languageCode: "en-US", priority: 1 }];
  const _c = (k: string): any => req.cookies[k];
  const activeUser = _c("active_user") || null;
  const theme =
    _c("theme") && Object.values(Theme).includes(_c("theme"))
      ? _c("theme")
      : defaults.theme;
  const listStyle =
    _c("list-style") && Object.values(ListStyle).includes(_c("list-style"))
      ? _c("list-style")
      : defaults.listStyle;
  const intro = !_c("hide-intro");

  let hiveEngineTokensProperties: TokenPropertiesMap =
    storedHiveEngineTokensProperties;
  const globalState: Global = {
    ...initialState.global,
    search_requests_allowed,
    negotiatedLanguages,
    acceptLanguage: acceptLanguage.length
      ? acceptLanguage
      : [{ languageCode: "en-US", priority: 1 }],
    acceptableLanguage,
    // @ts-ignore
    hiveEngineTokensProperties,
    theme: Theme[theme],
    listStyle: ListStyle[listStyle],
    intro,
    searchIndexCount: await getSearchIndexCount(),
    canUseWebp:
      req.headers.accept !== undefined &&
      req.headers.accept.indexOf("image/webp") !== -1,
    isMobile: !!(
      req.headers["user-agent"] &&
      ["iOS", "AndroidOS"].includes(
        getOperatingSystem(req.headers["user-agent"])
      )
    ),
    usePrivate: Boolean(parseInt(config.usePrivate, 10)),
  };
  const dynamicProps = await getDynamicProps();
  return {
    ...initialState,
    global: globalState,
    dynamicProps,
    activeUser: activeUser
      ? activeUserMaker(activeUser)
      : initialState.activeUser,
  };
};
