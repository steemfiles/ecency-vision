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
const thirty_seconds = 30000;
const one_minute = 60000;
const five_minutes = 5 * one_minute;
const ten_minutes = 10 * one_minute;
let storedHiveEngineTokensProperties: TokenPropertiesMap = {};
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
      if (ret && ret[LIQUID_TOKEN_UPPERCASE])
        console.log("Loading tokens properties...");
      else if (ret)
        console.log(
          `No ${LIQUID_TOKEN_UPPERCASE} token information stored.  Loading token properties...`
        );
      else
        console.log(
          `No token information stored.  Loading token properties...`
        );
      const prices: { [id: string]: number } = await getPrices([
        LIQUID_TOKEN_UPPERCASE,
      ]);
      const POBTokenInfos = await getScotDataAsync<HiveEngineTokenInfo>(
        "info",
        {
          token: LIQUID_TOKEN_UPPERCASE,
        }
      );
      const POBTokenConfigs = await getScotDataAsync<HiveEngineTokenConfig>(
        "config",
        { token: LIQUID_TOKEN_UPPERCASE }
      );
      const tokensInfos = await getScotDataAsync<{
        [coinname: string]: HiveEngineTokenInfo;
      }>("info", {});
      const tokensConfigs = await getScotDataAsync<
        Array<HiveEngineTokenConfig>
      >("config", {});
      tokensInfos["POB"] = POBTokenInfos;
      tokensConfigs.push(POBTokenConfigs);
      if (tokensInfos && tokensConfigs && prices) {
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
  const rawAcceptLanguage = (headers["accept-language"] || "").slice(0);
  const userAgent = (headers["user-agent"] || "").slice(0);
  let acceptableLanguage: { [languageCode: string]: boolean } = {};
  let negotiatedLanguages: Array<string> = [];
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
    console.log({
      rawAcceptLanguage,
      negotiatedLanguages,
      userAgent,
      search_requests_allowed,
    });
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
  try {
    if (!(
      storedHiveEngineTokensProperties &&
      storedHiveEngineTokensProperties[LIQUID_TOKEN_UPPERCASE]
    )) {
      console.log(
        "No token property information stored.  Loading tokens properties...",
        Object.keys(storedHiveEngineTokensProperties)
      );
    }
  } catch (e) {
    hiveEngineTokensProperties = {};
    console.log(
      "Trying to get data resulted in this exception:",
      JSON.stringify(e)
    );
  }
  if (rawAcceptLanguage != headers["accept-language"]) {
    console.log("Change of Accept-Language header during processing detected!", {saved: rawAcceptLanguage, after: headers['accept-language']});
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
