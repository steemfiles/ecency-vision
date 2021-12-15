import {
  HiveEngineTokenConfig,
  HiveEngineTokenInfo,
} from "../../api/hive-engine";

export interface TokenInfoConfigPriceTriple {
  config?: HiveEngineTokenConfig;
  info?: HiveEngineTokenInfo;
  hivePrice?: number;
}

export interface TokenPropertiesMap {
  [coinName: string]: TokenInfoConfigPriceTriple;
}

export enum HEActionTypes {
  FETCH = "@tokens/FETCH",
  INCLUDE = "@tokens/INCLUDE",
}

export interface HEFetchAction {
  type: HEActionTypes.FETCH;
}

export interface HEIncludeAction {
  type: HEActionTypes.INCLUDE;
  data: TokenPropertiesMap;
}

export type HEActions = HEIncludeAction | HEFetchAction;
