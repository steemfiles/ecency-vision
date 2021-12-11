import {
  HiveEngineTokenConfig,
  HiveEngineTokenInfo,
} from "../../api/hive-engine";

export interface TokenInfoConfigPair {
  config?: HiveEngineTokenConfig;
  info?: HiveEngineTokenInfo;
  hivePrice?: number;
}

export interface TokenPropertiesMap {
  [coinName: string]: TokenInfoConfigPair;
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

export interface HiveEngineStaticInfo {
  apiName: string;
  liquidHumanName: string;
  stakedHumanName: string;
  precision: number;
}

export type HEActions = HEIncludeAction | HEFetchAction;
