import { LocationChangeAction } from "../common";
import { ScotPost } from "../../api/hive-engine";

export interface EntryBeneficiaryRoute {
  account: string;
  weight: number;
}

export interface EntryVote {
  voter: string;
  rshares: number;
}

export interface EntryStat {
  flag_weight: number;
  gray: boolean;
  hide: boolean;
  total_votes: number;
  is_pinned?: boolean;
}

export interface JsonMetadata {
  tags?: string[];
  app?: any;
  canonical_url?: string;
  format?: string;
  original_author?: string;
  original_permlink?: string;
}

export interface Entry {
  active_votes: EntryVote[];
  author: string;
  author_payout_value: string;
  author_reputation: number;
  author_role?: string;
  author_title?: string;
  beneficiaries: EntryBeneficiaryRoute[];
  blacklists: string[];
  body: string;
  category: string;
  children: number;
  community?: string;
  community_title?: string;
  created: string;
  curator_payout_value: string;
  depth: number;
  is_paidout: boolean;
  json_metadata: JsonMetadata;
  max_accepted_payout: string;
  net_rshares: number;
  parent_author?: string;
  parent_permlink?: string;
  payout: number;
  payout_at: string;
  pending_payout_value: string;
  percent_hbd: number;
  permlink: string;
  post_id: number;
  promoted: string;
  reblogged_by?: string[];
  replies: any[];
  stats?: EntryStat;
  title: string;
  updated: string;
  url: string;
  original_entry?: Entry;
  he?: { [id: string]: ScotPost };
}
export function validateEntry(e: { [id: string]: unknown }): void {
  let missing_keys: Array<string> = [];
  if (e["active_votes"] === undefined) {
    console.log("Missing key active_votes");
    missing_keys.push("active_votes");
  }
  if (e["author"] === undefined) {
    console.log("Missing key author");
    missing_keys.push("author");
  }
  if (e["author_payout_value"] === undefined) {
    console.log("Missing key author_payout_value");
    missing_keys.push("author_payout_value");
  }
  if (e["author_reputation"] === undefined) {
    console.log("Missing key author_reputation");
    missing_keys.push("author_reputation");
  }
  //if (e["author_role?"] === undefined) {
  //  console.log("Missing key author_role?");
  //  missing_keys.push("author_role?");
  //}
  //if (e["author_title?"] === undefined) {
  //  console.log("Missing key author_title?");
  //  missing_keys.push("author_title?");
  //}
  if (e["beneficiaries"] === undefined) {
    console.log("Missing key beneficiaries");
    missing_keys.push("beneficiaries");
  }
  if (e["blacklists"] === undefined) {
    console.log("Missing key blacklists");
    missing_keys.push("blacklists");
  }
  if (e["body"] === undefined) {
    console.log("Missing key body");
    missing_keys.push("body");
  }
  if (e["category"] === undefined) {
    console.log("Missing key category");
    missing_keys.push("category");
  }
  if (e["children"] === undefined) {
    console.log("Missing key children");
    missing_keys.push("children");
  }
  //if (e["community?"] === undefined) {
  //  console.log("Missing key community?");
  //  missing_keys.push("community?");
  //}
  //if (e["community_title?"] === undefined) {
  //  console.log("Missing key community_title?");
  //  missing_keys.push("community_title?");
  //}
  if (e["created"] === undefined) {
    console.log("Missing key created");
    missing_keys.push("created");
  }
  if (e["curator_payout_value"] === undefined) {
    console.log("Missing key curator_payout_value");
    missing_keys.push("curator_payout_value");
  }
  if (e["depth"] === undefined) {
    console.log("Missing key depth");
    missing_keys.push("depth");
  }
  if (e["is_paidout"] === undefined) {
    console.log("Missing key is_paidout");
    missing_keys.push("is_paidout");
  }
  if (e["json_metadata"] === undefined) {
    console.log("Missing key json_metadata");
    missing_keys.push("json_metadata");
  }
  if (e["max_accepted_payout"] === undefined) {
    console.log("Missing key max_accepted_payout");
    missing_keys.push("max_accepted_payout");
  }
  if (e["net_rshares"] === undefined) {
    console.log("Missing key net_rshares");
    missing_keys.push("net_rshares");
  }
  //if (e["parent_author?"] === undefined) {
  //  console.log("Missing key parent_author?");
  //  missing_keys.push("parent_author?");
  //}
  //if (e["parent_permlink?"] === undefined) {
  //  console.log("Missing key parent_permlink?");
  //  missing_keys.push("parent_permlink?");
  //}
  if (e["payout"] === undefined) {
    console.log("Missing key payout");
    missing_keys.push("payout");
  }
  if (e["payout_at"] === undefined) {
    console.log("Missing key payout_at");
    missing_keys.push("payout_at");
  }
  if (e["pending_payout_value"] === undefined) {
    console.log("Missing key pending_payout_value");
    missing_keys.push("pending_payout_value");
  }
  if (e["percent_hbd"] === undefined) {
    console.log("Missing key percent_hbd");
    missing_keys.push("percent_hbd");
  }
  if (e["permlink"] === undefined) {
    console.log("Missing key permlink");
    missing_keys.push("permlink");
  }
  if (e["post_id"] === undefined) {
    console.log("Missing key post_id");
    missing_keys.push("post_id");
  }
  if (e["promoted"] === undefined) {
    console.log("Missing key promoted");
    missing_keys.push("promoted");
  }
  //if (e["reblogged_by?"] === undefined) {
  //  console.log("Missing key reblogged_by?");
  //  missing_keys.push("reblogged_by?");
  //}
  if (e["replies"] === undefined) {
    console.log("Missing key replies");
    missing_keys.push("replies");
  }
  //  //if (e["stats?"] === undefined) {
  //  //  console.log("Missing key stats?");
  //  //  missing_keys.push("stats?");
  //  //}
  if (e["title"] === undefined) {
    console.log("Missing key title");
    missing_keys.push("title");
  }
  if (e["updated"] === undefined) {
    console.log("Missing key updated");
    missing_keys.push("updated");
  }
  if (e["url"] === undefined) {
    console.log("Missing key url");
    missing_keys.push("url");
  }
  if (missing_keys.length) {
    throw Error("Missing keys: " + JSON.stringify(missing_keys));
  }
}

export function notAValidEntry(entry: Entry | any): entry is any {
  try {
    validateEntry(entry);
    return false;
  } catch (error) {
    // do nothing...    
  }
  return true;
}

export interface EntryGroup {
  entries: Entry[];
  error: string | null;
  loading: boolean;
  hasMore: boolean;
}

export interface Entries extends Record<string, EntryGroup> {}

export enum ActionTypes {
  FETCH = "@entries/FETCH",
  FETCHED = "@entries/FETCHED",
  FETCH_ERROR = "@entries/FETCH_ERROR",
  INVALIDATE = "@entries/INVALIDATE",
  UPDATE = "@entries/UPDATE",
}

export interface FetchAction {
  type: ActionTypes.FETCH;
  groupKey: string;
}

export interface FetchErrorAction {
  type: ActionTypes.FETCH_ERROR;
  groupKey: string;
  error: string;
}

export interface FetchedAction {
  type: ActionTypes.FETCHED;
  groupKey: string;
  entries: Entry[];
  hasMore: boolean;
}

export interface InvalidateAction {
  type: ActionTypes.INVALIDATE;
  groupKey: string;
}

export interface UpdateAction {
  type: ActionTypes.UPDATE;
  entry: Entry;
}

export type Actions =
  | LocationChangeAction
  | FetchAction
  | FetchedAction
  | FetchErrorAction
  | InvalidateAction
  | UpdateAction;
