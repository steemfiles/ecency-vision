export interface PriceHash {
  [shortCoinName: string]: number /* in Hive */;
}

export enum ActionTypes {
  INCLUDE = "@prices/INCLUDE",
}

export interface IncludeAction {
  type: ActionTypes.INCLUDE;
  data: PriceHash;
}

export type Actions = IncludeAction; // | .. | ..
