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
const five_minutes = 300000;
const ten_minutes = 600000;
let storedHiveEngineTokensProperties: TokenPropertiesMap;
let storedInfos : {[id:string]:HiveEngineTokenInfo} = {};
let storedConfigs : Array<HiveEngineTokenConfig> = [];
let storedPrices : {[id:string]:number} = {};
let fetchingPrices : boolean = false;
let lastStore : Date;
export const makePreloadedState = async (req: express.Request): Promise<AppState> => {
    const _c = (k: string): any => req.cookies[k];
    const activeUser = _c("active_user") || null;
    const theme = _c("theme") && Object.values(Theme).includes(_c("theme")) ? _c("theme") : defaults.theme;
    const listStyle = _c("list-style") && Object.values(ListStyle).includes(_c("list-style")) ? _c("list-style") : defaults.listStyle;
    const intro = !_c("hide-intro");
    let hiveEngineTokensProperties: TokenPropertiesMap = storedHiveEngineTokensProperties;
    let tokensInfos,tokensConfigs, prices;
    try {
        if (storedHiveEngineTokensProperties && storedHiveEngineTokensProperties[LIQUID_TOKEN_UPPERCASE]) {
            let newStore : Date;
            if (lastStore.getTime() + ten_minutes < (newStore = new Date).getTime() && (!fetchingPrices)) {
                // It's been five minutes since last update
                console.log("Pulling new price data", lastStore, newStore);
                fetchingPrices = true;
                getPrices(undefined).then(
                    prices => {
                        try {
                            if (!prices)
                                return;
                            storedPrices = {...prices,...storedPrices};
                            for (const token in prices) {
                                let config : HiveEngineTokenConfig | undefined;
                                if (hiveEngineTokensProperties[token]) {
                                    hiveEngineTokensProperties[token].hivePrice = prices[token];
                                } else if (storedInfos[token] && (config=storedConfigs.find(c => c.token === token))) {
                                    hiveEngineTokensProperties[token] = {info: storedInfos[token], config, hivePrice: prices[token]};
                                }
                            } // for
                            lastStore = new Date;
                        } catch (e) {
                        } finally {
                            fetchingPrices = false;
                        }
                    });
            }
        } else {
            console.log("No tokens stored.  Loading tokens Properties.");
            tokensInfos = await getScotDataAsync<{[coinname:string]:HiveEngineTokenInfo}>('info', {});
            tokensConfigs = await getScotDataAsync<Array<HiveEngineTokenConfig>>('config', {});
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
                    ret[token] = {info: tokensInfos[token], config, hivePrice: prices[token]};
                }
                storedHiveEngineTokensProperties = hiveEngineTokensProperties = ret;
                if (ret[LIQUID_TOKEN_UPPERCASE]) {
                    lastStore = new Date();
                    console.log({lastStore});
                }
                console.log("Success loading HiveEngine Tokens Properties from API");
            }
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
