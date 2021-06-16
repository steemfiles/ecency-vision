import express from "express";

import {AppState} from "../common/store";

import initialState from "../common/store/initial-state";

import {Global, ListStyle, Theme} from "../common/store/global/types";

import {activeUserMaker} from "../common/store/helper";

import defaults from "../common/constants/defaults.json";

import config from "../config";

import {getSearchIndexCount, getDynamicProps} from "./helper";

import {getOperatingSystem} from "../common/util/platform";
import {getPrices, getScotDataAsync, HiveEngineTokenConfig, HiveEngineTokenInfo} from "../common/api/hive-engine";
import {LIQUID_TOKEN_UPPERCASE} from "../client_config";
import {TokenPropertiesMap} from "../common/store/hive-engine-tokens/types";


let storedHiveEngineTokensProperties: TokenPropertiesMap;

export const makePreloadedState = async (req: express.Request): Promise<AppState> => {
    const _c = (k: string): any => req.cookies[k];

    const activeUser = _c("active_user") || null;

    const theme = _c("theme") && Object.values(Theme).includes(_c("theme")) ? _c("theme") : defaults.theme;
    const listStyle = _c("list-style") && Object.values(ListStyle).includes(_c("list-style")) ? _c("list-style") : defaults.listStyle;
    const intro = !_c("hide-intro");
    let hiveEngineTokensProperties: TokenPropertiesMap = {};
    let tokensInfos,tokensConfigs, prices;
    try {
		if (!storedHiveEngineTokensProperties || !storedHiveEngineTokensProperties[LIQUID_TOKEN_UPPERCASE]) {
			console.log("No tokens stored.  Loading for the first time.");
			tokensInfos = await getScotDataAsync<{[coinname:string]:HiveEngineTokenInfo}>('info', {});
			tokensConfigs = await getScotDataAsync<Array<HiveEngineTokenConfig>>('config', {});
			prices = await getPrices(undefined);
			let ret = storedHiveEngineTokensProperties || {};			
			if (tokensInfos && tokensConfigs && prices) {
				for (const config of tokensConfigs) {
					const token = config.token;
					if (!tokensInfos[token] || !prices[token]) {
						//console.log("Cannot get info or price for ", token);
						continue;
					}
					ret[token] = {info: tokensInfos[token], config, hivePrice: prices[token]};
				}
				storedHiveEngineTokensProperties = hiveEngineTokensProperties = ret;
				console.log("Success loading HiveEngineTokensProperties from API");
			} else {
				hiveEngineTokensProperties = ret;
				console.log("Failure to get meaningful data");
			}
		} else {
			console.log("reusing stored token information");
			hiveEngineTokensProperties = storedHiveEngineTokensProperties;
		}
	} catch (e) {
		hiveEngineTokensProperties = {};
		console.log("Trying to get data resulted in this exception:", JSON.stringify(e));
	}

    const globalState: Global = {
        ...initialState.global,
        // @ts-ignore
        hiveEngineTokensProperties,
        theme: Theme[theme],
        listStyle: ListStyle[listStyle],
        intro,
        searchIndexCount: await getSearchIndexCount(),
        canUseWebp: req.headers.accept !== undefined && req.headers.accept.indexOf("image/webp") !== -1,
        isMobile: !!(req.headers["user-agent"] && ["iOS", "AndroidOS"].includes(getOperatingSystem(req.headers["user-agent"]))),
        usePrivate: Boolean(parseInt(config.usePrivate, 10))
    };

    const dynamicProps = await getDynamicProps();

    return {
        ...initialState,
        global: globalState,
        dynamicProps,
        activeUser: activeUser ? activeUserMaker(activeUser) : initialState.activeUser,
    }
}
