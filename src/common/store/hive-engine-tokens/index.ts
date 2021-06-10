import {Dispatch} from "redux";
import {Actions, ActionTypes, FetchedAction, IncludeAction, TokenPropertiesMap} from "./types";
import {AppState} from "../index";
import {getDynamicProps, getTrendingTags} from "../../api/hive";
import {fetchAct, fetchErrorAct} from "../trending-tags";
import {
    getPrices,
    getScotDataAsync,
    HiveEngineTokenConfig,
    HiveEngineTokenInfo,
} from "../../api/hive-engine";
import {LIQUID_TOKEN_UPPERCASE} from "../../../client_config";

export const initialState: TokenPropertiesMap = {};

export default (state: TokenPropertiesMap = initialState, action: Actions): TokenPropertiesMap => {
    switch (action.type) {
        case ActionTypes.INCLUDE: {
            const {data} = action;
            return Object.assign(state,data);
        }
        case ActionTypes.FETCH: {
            const {data} = action;
            return Object.assign(state,data);
        }
        default:
            return state;
    }
};

/* Actions */
export const includeInfoConfigs = (data: TokenPropertiesMap) => (dispatch: Dispatch) => {
    dispatch(includeInfoConfigsAction(data));
};

/* Action Creators */
export const includeInfoConfigsAction = (data: TokenPropertiesMap): IncludeAction => {
    return {
        type: ActionTypes.INCLUDE,
        data,
    };
};

/* Actions */
export const fetchInfoConfigsProps = () => (dispatch: Dispatch) => {
    Promise.all(
        [
            getScotDataAsync<HiveEngineTokenInfo>('info', {token: LIQUID_TOKEN_UPPERCASE,}),
            getScotDataAsync<HiveEngineTokenConfig>('config', {token: LIQUID_TOKEN_UPPERCASE,}),
            getPrices([LIQUID_TOKEN_UPPERCASE])]
    ).then((r) => {
        let info = r[0];
        let config = r[1];
        const prices = r[2];
        if (info["POB"]) {
            info = info["POB"];
        }
        if (config["POB"]) {
            config = config["POB"];
        }
        const hivePrice = prices["POB"];
        dispatch(includeInfoConfigsAction({[LIQUID_TOKEN_UPPERCASE]: {info, config, hivePrice}}));
    });
};

/* Action Creators */
export const fetchedAct = (_map: TokenPropertiesMap): FetchedAction => {
    return {
        type: ActionTypes.FETCH,
        data: _map,
    };
};
