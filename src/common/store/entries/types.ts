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
export function validateEntry(ep: unknown): ep is Entry {
  if (typeof ep != "object") {
    console.log("Passed value isn't even an object");
    throw Error("Passed value isn't even an object");
  }
  const e = ep as Object;
  let missing_keys: Array<string> = [];
  if (e["active_votes"] === undefined) {
    
    missing_keys.push("active_votes");
  }
  if (e["author"] === undefined) {
    
    missing_keys.push("author");
  }
  if (e["author_payout_value"] === undefined) {
    
    missing_keys.push("author_payout_value");
  }
  if (e["author_reputation"] === undefined) {
    
    missing_keys.push("author_reputation");
  }
  //if (e["author_role?"] === undefined) {
  //  
  //  missing_keys.push("author_role?");
  //}
  //if (e["author_title?"] === undefined) {
  //  
  //  missing_keys.push("author_title?");
  //}
  if (e["beneficiaries"] === undefined) {
    
    missing_keys.push("beneficiaries");
  }
  if (e["blacklists"] === undefined) {
    
    missing_keys.push("blacklists");
  }
  if (e["body"] === undefined) {
    
    missing_keys.push("body");
  }
  if (e["category"] === undefined) {
    
    missing_keys.push("category");
  }
  if (e["children"] === undefined) {
    
    missing_keys.push("children");
  }
  //if (e["community?"] === undefined) {
  //  
  //  missing_keys.push("community?");
  //}
  //if (e["community_title?"] === undefined) {
  //  
  //  missing_keys.push("community_title?");
  //}
  if (e["created"] === undefined) {
    
    missing_keys.push("created");
  }
  if (e["curator_payout_value"] === undefined) {
    
    missing_keys.push("curator_payout_value");
  }
  if (e["depth"] === undefined) {
    
    missing_keys.push("depth");
  }
  if (e["is_paidout"] === undefined) {
    
    missing_keys.push("is_paidout");
  }
  if (e["json_metadata"] === undefined) {
    
    missing_keys.push("json_metadata");
  }
  if (e["max_accepted_payout"] === undefined) {
    
    missing_keys.push("max_accepted_payout");
  }
  if (e["net_rshares"] === undefined) {
    
    missing_keys.push("net_rshares");
  }
  //if (e["parent_author?"] === undefined) {
  //  
  //  missing_keys.push("parent_author?");
  //}
  //if (e["parent_permlink?"] === undefined) {
  //  
  //  missing_keys.push("parent_permlink?");
  //}
  if (e["payout"] === undefined) {
    
    missing_keys.push("payout");
  }
  if (e["payout_at"] === undefined) {
    
    missing_keys.push("payout_at");
  }
  if (e["pending_payout_value"] === undefined) {
    
    missing_keys.push("pending_payout_value");
  }
  if (e["percent_hbd"] === undefined) {
    
    missing_keys.push("percent_hbd");
  }
  if (e["permlink"] === undefined) {
    
    missing_keys.push("permlink");
  }
  if (e["post_id"] === undefined) {
    
    missing_keys.push("post_id");
  }
  if (e["promoted"] === undefined) {
    
    missing_keys.push("promoted");
  }
  //if (e["reblogged_by?"] === undefined) {
  //  
  //  missing_keys.push("reblogged_by?");
  //}
  if (e["replies"] === undefined) {
    
    missing_keys.push("replies");
  }
  //  //if (e["stats?"] === undefined) {
  //  //  
  //  //  missing_keys.push("stats?");
  //  //}
  if (e["title"] === undefined) {
    
    missing_keys.push("title");
  }
  if (e["updated"] === undefined) {
    
    missing_keys.push("updated");
  }
  if (e["url"] === undefined) {
    
    missing_keys.push("url");
  }
  if (missing_keys.length) {
    throw Error("Missing keys: " + JSON.stringify(missing_keys));
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
