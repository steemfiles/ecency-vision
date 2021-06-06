import {HiveEngineTokenConfig, HiveEngineTokenInfo} from "../../api/hive-engine"

export interface TokenInfoConfigPair {
    config?: HiveEngineTokenConfig;
    info?: HiveEngineTokenInfo;
    hivePrice?: number;
}

export interface TokenPropertiesMap {
    [coinName: string]:TokenInfoConfigPair
}

export enum ActionTypes {
    FETCH = "@tokens/FETCH",
    INCLUDE = "@tokens/INCLUDE"
}

export interface FetchedAction {
    type: ActionTypes.FETCH;
    data: TokenPropertiesMap;
}

export interface IncludeAction {
    type: ActionTypes.INCLUDE;
    data: TokenPropertiesMap;
}

export type Actions = IncludeAction | FetchedAction;
