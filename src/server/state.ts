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
import {TokenToInfoConfigPairMap} from "../common/store/hive-engine-tokens/types";

export const makePreloadedState = async (req: express.Request): Promise<AppState> => {
    const _c = (k: string): any => req.cookies[k];

    const activeUser = _c("active_user") || null;

    const theme = _c("theme") && Object.values(Theme).includes(_c("theme")) ? _c("theme") : defaults.theme;
    const listStyle = _c("list-style") && Object.values(ListStyle).includes(_c("list-style")) ? _c("list-style") : defaults.listStyle;
    const intro = !_c("hide-intro");
    const prices = await getPrices(undefined);
    const tokenInfo = await getScotDataAsync<HiveEngineTokenInfo>('info', {token: LIQUID_TOKEN_UPPERCASE,});
    const tokenConfig = await getScotDataAsync<{[coinname:string]:HiveEngineTokenConfig}>('config', {token: LIQUID_TOKEN_UPPERCASE,});
    const hiveEngineTokensProperties : TokenToInfoConfigPairMap = !!tokenConfig[LIQUID_TOKEN_UPPERCASE] ? { LIQUID_TOKEN_UPPERCASE : {config: tokenConfig, info: tokenInfo} } : {};

    const globalState: Global = {
        ...initialState.global,
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
        // Hive Engine Prices (not that of HBD or Hive)
        prices: prices,
        hiveEngineTokensProperties,
        global: globalState,
        dynamicProps,
        activeUser: activeUser ? activeUserMaker(activeUser) : initialState.activeUser,
    }
}
