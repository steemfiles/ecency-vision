import {HiveEngineTokenConfig, HiveEngineTokenInfo} from "../../api/hive-engine"


export interface TokenInfoConfigPair {
    config: HiveEngineTokenConfig;
    info: HiveEngineTokenInfo;
}

export interface TokenToInfoConfigPairMap {
    [coinName: string]:TokenInfoConfigPair
}

export enum ActionTypes {
    INCLUDE = "@tokens/INCLUDE",
}



export interface IncludeAction {
    type: ActionTypes.INCLUDE;
    data: TokenToInfoConfigPairMap;
}

export type Actions = IncludeAction; // | .. | ..
