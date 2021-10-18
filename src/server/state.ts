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
import { LIQUID_TOKEN_UPPERCASE } from "../client_config";
import { TokenPropertiesMap } from "../common/store/hive-engine-tokens/types";
import { langOptions } from "../common/i18n";

const five_minutes = 300000;
const ten_minutes = 600000;
let storedHiveEngineTokensProperties: TokenPropertiesMap;
let storedInfos: { [id: string]: HiveEngineTokenInfo } = {};
let storedConfigs: Array<HiveEngineTokenConfig> = [];
let storedPrices: { [id: string]: number } = {};
let fetchingPrices: boolean = false;
let lastStore: Date;
let search_requests_allowed: undefined | number = undefined;
const one_hundred_fifty_minutes = 15 * ten_minutes;

const fetch_search_requests_allowed = async (): void =>{
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

}

fetch_search_requests_allowed();
setInterval(fetch_search_requests_allowed, one_hundred_fifty_minutes);


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
  let acceptableLanguage: { [languageCode: string]: boolean } = {};
  let negotiatedLanguages: Array<string> = [];
  const headers = (req && req.headers) || {};
  const rawAcceptLanguage = headers["accept-language"] || "";
  const userAgent = headers['user-agent'] || "";
  const acceptLanguage = rawAcceptLanguage
    .split(/;/)
    .map((languages_priority_pair_string) => {
      const languages_priority_vector =
        languages_priority_pair_string.split(/, */);
      let priority: number = 1;
      let lang_struct_vector: Array<LanguageSpec> = [];
      for (const language of languages_priority_vector) {
        const new_priority = language.split(/=/);
        if (new_priority.length > 1 && new_priority[0] === "q") {
          priority = parseFloat(new_priority[1]);
        }
      }
      for (const languageCode of languages_priority_vector) {
        const new_priority = languageCode.split(/=/);
        if (new_priority.length === 1 || new_priority[0] !== "q") {
          acceptableLanguage[languageCode] = true;
          lang_struct_vector.push({ priority, languageCode });
        }
      }
      return lang_struct_vector;
    })
    .flat()
    .filter(function (lang_struct: LanguageSpec) {
      for (const availableLanguage of langOptions) {
        if (
          lang_struct.languageCode.split(/-/)[0] ==
          availableLanguage.code.split(/-/)[0]
        ) {
          if (!negotiatedLanguages.includes(availableLanguage.code)) {
            negotiatedLanguages.push(availableLanguage.code);
          }
          return (acceptableLanguage[availableLanguage.code.split(/-/)[0]] =
            acceptableLanguage[availableLanguage.code] =
              true);
        }
      }
      return false;
    })
    .sort(function (a: LanguageSpec, b: LanguageSpec) {
      return b.priority - a.priority;
    });

  if (negotiatedLanguages.length === 0) {
    negotiatedLanguages.push("en-US");
  }
  // only log human requests.
  if (rawAcceptLanguage !== "" && userAgent !== "") {
    console.log({ rawAcceptLanguage, negotiatedLanguages, userAgent, search_requests_allowed });
  }
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
  let tokensInfos, tokensConfigs, prices;

  try {
    if (
      storedHiveEngineTokensProperties &&
      storedHiveEngineTokensProperties[LIQUID_TOKEN_UPPERCASE]
    ) {
      let newStore: Date;
      if (
        lastStore.getTime() + ten_minutes < (newStore = new Date()).getTime() &&
        !fetchingPrices
      ) {
        // It's been five minutes since last update
        console.log("Pulling new price data", lastStore, newStore);
        fetchingPrices = true;
        getPrices(undefined).then((prices) => {
          try {
            if (!prices) return;
            storedPrices = { ...prices, ...storedPrices };
            for (const token in prices) {
              let config: HiveEngineTokenConfig | undefined;
              if (hiveEngineTokensProperties[token]) {
                hiveEngineTokensProperties[token].hivePrice = prices[token];
              } else if (
                storedInfos[token] &&
                (config = storedConfigs.find((c) => c.token === token))
              ) {
                hiveEngineTokensProperties[token] = {
                  info: storedInfos[token],
                  config,
                  hivePrice: prices[token],
                };
              }
            } // for
            lastStore = new Date();
          } catch (e) {
          } finally {
            fetchingPrices = false;
          }
        });
      }
    } else {
      console.log(
        "No token property information stored.  Loading tokens properties..."
      );
      tokensInfos = await getScotDataAsync<{
        [coinname: string]: HiveEngineTokenInfo;
      }>("info", {});
      tokensConfigs = await getScotDataAsync<Array<HiveEngineTokenConfig>>(
        "config",
        {}
      );
      prices = await getPrices(undefined);
      let ret = storedHiveEngineTokensProperties || {};
      if (tokensInfos && tokensConfigs && prices) {
        // cache them all here.
        storedInfos = tokensInfos;
        storedConfigs = tokensConfigs;
        storedPrices = prices;
        for (const config of tokensConfigs) {
          const token = config.token;
          if (!tokensInfos[token] || !prices[token]) {
            //console.log("Cannot get info or price for ", token);
            continue;
          }
          ret[token] = {
            info: tokensInfos[token],
            config,
            hivePrice: prices[token],
          };
        }
        storedHiveEngineTokensProperties = hiveEngineTokensProperties = ret;
        if (ret[LIQUID_TOKEN_UPPERCASE]) {
          lastStore = new Date();
          console.log({ lastStore });
        }
        console.log("Success loading HiveEngine Tokens Properties from API");
      }
    }
  } catch (e) {
    hiveEngineTokensProperties = {};
    console.log(
      "Trying to get data resulted in this exception:",
      JSON.stringify(e)
    );
  }
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
