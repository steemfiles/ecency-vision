/*
import o2j from 'shared/clash/object2json';
import { ifHivemind } from 'app/utils/Community';
import stateCleaner from 'app/redux/stateCleaner';
import {
    fetchCrossPosts,
    augmentContentWithCrossPost,
} from './util/CrossPosts';
*/
import axios from "axios";
// @ts-ignore
import SSC from "sscjs";
import {
  HECoarseTransaction,
  HEFineTransaction,
} from "../store/transactions/types";
import { getAccount, getAccounts, getFollowCount, getPost } from "./hive";
import {
  AccountFollowStats,
  BaseAccount,
  Account,
  FullAccount,
} from "../store/accounts/types";
import {
  Entry,
  EntryBeneficiaryRoute,
  EntryStat,
  EntryVote,
} from "../store/entries/types";
const hiveSsc = new SSC("https://api.hive-engine.com/rpc");

export type HELiquidAsset =
  | "POB"
  | "VYB"
  | "WEED"
  | "SWAP.HIVE"
  | "SWAP.HBD"
  | "TEST";
export type HEStakedAsset = "VP" | "BP" | "WP" | "TP";
export type LiquidAsset =
  | "HIVE"
  | "HBD"
  | "TEST"
  | "HBD"
  | "TBD"
  | "POINT"
  | HELiquidAsset;
export type StakedAsset = "HP" | "TP" | HEStakedAsset;
type AssetType = LiquidAsset | StakedAsset;

export interface TokenStatus {
  downvote_weight_multiplier: number;
  downvoting_power: number;
  earned_mining_token: number;
  earned_other_token: number;
  earned_staking_token: number;
  earned_token: number;
  hive: boolean;
  last_downvote_time: string;
  last_follow_refresh_time: string;
  last_post: string;
  last_root_post: string;
  last_vote_time: string;
  last_won_mining_claim: string;
  last_won_staking_claim: string;
  loki: null | unknown;
  muted: boolean;
  name: string;
  pending_token: number;
  precision: number;
  staked_mining_power: number;
  staked_tokens: number;
  symbol: string;
  vote_weight_multiplier: number;
  voting_power: number;
}
export interface UnStake {
  _id: number;
  account: string;
  symbol: string;
  quantity: string;
  quantityLeft: string;
  nextTransactionTimestamp: number;
  numberTransactionsLeft: string;
  millisecPerPeriod: string;
  txID: string;
}
// Hopefully we can make this dynamic some soon
const defaultPrices = {
  POB: 0,
  LEO: 0,
  "SWAP.BTC": 1,
  "SWAP.HIVE": 1,
};
export async function getPrices(
  token_list: undefined | Array<string>
): Promise<{ [shortCoinName: string]: number /* in Hive */ }> {
  let failedFetches: Array<string> = [];
  let obj: any = {
    "SWAP.HIVE": 1,
  };
  try {
    const others = await hiveSsc.find("market", "tradesHistory", {
      type: "buy",
    });
    for (const other of others) {
      obj[other.symbol] = parseFloat(other.price);
    }
    if (token_list) {
      for (const i in token_list) {
        const symbol = token_list[i];
        if (symbol === "SWAP.HIVE") {
          obj["SWAP.HIVE"] = 1;
        } else if (!obj[symbol]) {
          try {
            const recentTrades: Array<{ price: string }> = await hiveSsc.find(
              "market",
              "tradesHistory",
              {
                symbol,
                type: "buy",
              }
            );
            if (recentTrades && recentTrades.length) {
              const recentTrade = recentTrades[0];
              const rate = parseFloat(recentTrade.price);
              obj[symbol] = rate;
            } else {
              throw new Error("Cannot fetch price for " + symbol);
            }
          } catch (e) {
            failedFetches.push(symbol);
          }
        } // if
      } // for
    } // if
    if (failedFetches.length) {
    }
    return obj;
  } catch (e) {
    console.log("getPrices are failing:", e.message,  e.statusCode);
  }
  return { ...defaultPrices, ...obj };
}
interface RawTokenBalance {
  _id: number;
  account: string;
  symbol: string;
  balance: string;
  stake: string;
  pendingUnstake: string;
  delegationsIn: string;
  delegationsOut: string;
  pendingUndelegations: string;
}
export interface TokenBalance {
  _id: number;
  account: string;
  symbol: string;
  balance: number;
  stake: number;
  pendingUnstake: number;
  delegationsIn: number;
  delegationsOut: number;
  pendingUndelegations: number;
}
export const isNonZeroBalance = (t: TokenBalance) => {
  if (t) {
    const { balance, stake, delegationsIn } = t;
    return balance !== 0 || stake !== 0 || delegationsIn !== 0;
  }
  return false;
};

export interface CoinDescription {
  downvote_weight_multiplier: number;
  downvoting_power: number;
  earned_mining_token: number;
  earned_other_token: number;
  earned_staking_token: number;
  earned_token: number;
  hive: boolean;
  last_downvote_time: string;
  last_follow_refresh_time: string;
  last_post: string;
  last_root_post: string;
  last_vote_time: string;
  last_won_mining_claim: string;
  last_won_staking_claim: string;
  loki: any | null;
  muted: boolean;
  name: string;
  pending_token: number;
  precision: number;
  staked_mining_power: number;
  staked_tokens: number;
  symbol: string;
  vote_weight_multiplier: number;
  voting_power: number;
}
export interface FullHiveEngineAccount extends FullAccount {
  follow_stats: AccountFollowStats | undefined;
  token_balances: Array<TokenBalance>;
  token_unstakes: Array<UnStake>;
  token_statuses: {
    data: { [id: string]: TokenStatus } | null;
    hiveData: { [id: string]: TokenStatus } | null;
  };
  transfer_history: undefined | null | Array<HEFineTransaction>;
  token_delegations?: any /* seems to be undefined sometimes */;
  prices: { [id: string]: number };
}
function is_not_FullAccount(account: Account) {
  return !account;
}
export function is_not_FullHiveEngineAccount(
  account: FullHiveEngineAccount | FullAccount | BaseAccount
) {
  if (
    is_not_FullAccount(account) ||
    !account["token_balances"] ||
    !account["prices"] ||
    !account["follow_stats"]
  )
    return true;
  return false;
}
export function is_FullHiveEngineAccount(
  account: FullHiveEngineAccount | FullAccount | BaseAccount
): account is FullHiveEngineAccount {
  return !is_not_FullHiveEngineAccount(account);
}
async function callApi<T>(url: string, params: any): T {
  return await axios({
    url,
    method: "GET",
    params,
  }).then((response) => {
    return response.data;
  });
}
// Exclude author and curation reward details
export async function getCoarseTransactions(
  account: string,
  limit: number,
  symbol: string,
  offset: number = 0
) {
  const transfers: Array<HECoarseTransaction> = await callApi<
    Array<HECoarseTransaction>
  >("https://accounts.hive-engine.com/accountHistory", {
    account,
    limit,
    offset,
    type: "user",
    symbol,
  });
  return transfers;
}
// Include virtual transactions like curation and author reward details.
export async function getFineTransactions(
  symbol: string,
  account: string,
  limit: number,
  offset: number
): Promise<Array<HEFineTransaction>> {
  const history: Array<HEFineTransaction> = await getScotDataAsync<
    Array<HEFineTransaction>
  >("get_account_history", {
    account,
    token: symbol,
    limit,
    offset,
  });
  return history;
}
export async function getScotDataAsync<T>(
  path: string,
  params: object
): Promise<T> {
  const x: T = await callApi(
    `https://scot-api.hive-engine.com/${path}`,
    params
  );
  return x;
}
export async function getScotAccountDataAsync(account: string): Promise<{
  data: null | { [id: string]: TokenStatus };
  hiveData: null | { [id: string]: TokenStatus };
}> {
  let hiveData = await getScotDataAsync<{ [id: string]: TokenStatus }>(
    `@${account}`,
    {
      hive: 1,
    }
  );
  return { data: null, hiveData };
}
function mergeContent(
  content: Entry,
  tokenPostData: { [id: string]: ScotPost }
) {
  const { he } = content;
  content.he = Object.assign(he ?? {}, tokenPostData);
  return content;
}
export const enginifyPost = (post: Entry, observer: string): Promise<Entry> => {
  const { author, permlink } = post;
  const scot_data_promise = getScotDataAsync<{ [id: string]: ScotPost }>(
    `@${post.author}/${post.permlink}?hive=1`,
    {}
  );
  return scot_data_promise
    .then(
      (scotData) => {
        mergeContent(post, scotData);
        return post;
      },
      (value) => {
        return post;
      }
    )
    .catch((e) => {
      console.log("enginify failed.");
      return post;
    });
};
export async function getAccountHEFull(
  account: string,
  notUsed: boolean,
  symbols: Array<string> = []
): Promise<FullHiveEngineAccount> {
  let follow_stats: AccountFollowStats | undefined = {
    account,
    follower_count: 0,
    following_count: 0,
  };
  const userHive = true;
  try {
    let hiveAccount: FullAccount,
      rawTokenBalances: Array<RawTokenBalance>,
      tokenUnstakes: Array<UnStake>,
      tokenStatuses: {
        data: { [id: string]: TokenStatus } | null;
        hiveData: { [id: string]: TokenStatus } | null;
      },
      transferHistory: any,
      tokenDelegations: any;
    [
      hiveAccount,
      rawTokenBalances,
      tokenUnstakes,
      tokenStatuses,
      transferHistory,
      tokenDelegations,
    ] = await Promise.all([
      getAccount(account),
      // modified to get all tokens. - by anpigon
      hiveSsc.find("tokens", "balances", {
        account,
      }),
      hiveSsc.find("tokens", "pendingUnstakes", {
        account,
      }),
      getScotAccountDataAsync(account),
      getScotDataAsync<Array<HEFineTransaction>>("get_account_history", {
        account,
        limit: 100,
        offset: 0,
      }),
      hiveSsc.find("tokens", "delegations", {
        $or: [{ from: account }, { to: account }],
      }),
    ]);
    let modifiedTokenBalances: Array<TokenBalance> = [];
    // There is no typesafe way to modify the type of something
    // in place.  You have to do a typecast eventually or participate in
    // copying.
    let rawTokenBalance: RawTokenBalance | undefined = undefined;
    while ((rawTokenBalance = rawTokenBalances.pop())) {
      if (
        typeof rawTokenBalance["_id"] !== "number" ||
        typeof rawTokenBalance["symbol"] !== "string" ||
        typeof rawTokenBalance["balance"] !== "string" ||
        typeof rawTokenBalance["stake"] !== "string"
      )
        continue;

      // pass by reference semantics modifies the array.
      // This is on purpose.
      const tokenBalance: TokenBalance = Object.assign(rawTokenBalance, {
        delegationsIn: parseFloat(rawTokenBalance.delegationsIn),
        balance: parseFloat(rawTokenBalance.balance),
        stake: parseFloat(rawTokenBalance.stake),
        delegationsOut: parseFloat(rawTokenBalance.delegationsOut),
        pendingUndelegations: parseFloat(rawTokenBalance.pendingUndelegations),
        pendingUnstake: parseFloat(rawTokenBalance.pendingUndelegations),
      });
      modifiedTokenBalances.push(tokenBalance);
    }
    // Now tokenBalances is an Array<TokenBalance>.
    const prices = await getPrices(
      modifiedTokenBalances.map((tb) => tb.symbol)
    );
    let follow_stats: AccountFollowStats | undefined;
    try {
      follow_stats = await getFollowCount(account);
    } catch (e) {}
    return {
      ...hiveAccount,
      follow_stats,
      token_balances: modifiedTokenBalances,
      token_unstakes: tokenUnstakes,
      token_statuses: tokenStatuses,
      transfer_history: transferHistory,
      token_delegations: tokenDelegations,
      prices,
      __loaded: true,
    };
  } catch (e) {
    console.log("getAccountHEFull threw an exception");
    const hiveAccount = await getAccount(account);
    try {
      follow_stats = await getFollowCount(account);
    } catch (e) {}
    return {
      ...hiveAccount,
      follow_stats: { account, follower_count: 0, following_count: 0 },
      token_balances: [],
      token_unstakes: [],
      token_statuses: { data: {}, hiveData: {} },
      transfer_history: null,
      prices: { "HIVE.SWAP": 1 },
      __loaded: true,
    };
  }
}
export interface HiveEngineTokenInfo {
  claimed_token: number;
  comment_pending_rshares: number;
  comment_reward_pool: number;
  enable_automatic_account_claim: boolean;
  enable_comment_reward_pool: boolean;
  enabled: boolean;
  enabled_services: undefined | any;
  hive: boolean;
  inflation_tools: number;
  issued_token: undefined | any;
  issuer: string;
  last_compute_post_reward_block_num: number;
  last_mining_claim_block_num: undefined | any;
  last_mining_claim_trx: undefined | any;
  last_other_accounts_transfer_block_num: number;
  last_processed_mining_claim_block_num: number;
  last_processed_staking_claim_block_num: number;
  last_reduction_block_num: number;
  last_reward_block_num: number;
  last_rshares2_decay_time: string; // date
  last_staking_claim_block_num: undefined | any;
  last_staking_claim_trx: undefined | any;
  last_staking_mining_update_block_num: undefined | any;
  mining_enabled: boolean;
  mining_reward_pool: number;
  next_mining_claim_number: number;
  next_staking_claim_number: number;
  other_reward_pool: number;
  pending_rshares: number;
  pending_token: number;
  precision: number;
  reward_pool: undefined | number;
  rewards_token: undefined | number;
  setup_complete: number;
  staked_mining_power: number;
  staked_token: number;
  staking_enabled: boolean;
  staking_reward_pool: number;
  start_block_num: number;
  start_date: string; // date
  symbol: string;
  total_generated_token: number;
  voting_enabled: boolean;
}
export interface HiveEngineTokenConfig {
  allowlist_account: string | null;
  author_curve_exponent: number;
  author_reward_percentage: number;
  badge_fee: number;
  beneficiaries_account: string;
  beneficiaries_reward_percentage: number;
  cashout_window_days: number;
  curation_curve_exponent: number;
  disable_downvoting: boolean;
  downvote_power_consumption: number;
  downvote_regeneration_seconds: number;
  downvote_window_days: number;
  enable_account_allowlist: null | boolean;
  enable_account_muting: boolean;
  enable_comment_beneficiaries: boolean;
  exclude_apps: null | string;
  exclude_apps_from_token_beneficiary: null | string;
  exclude_beneficiaries_accounts: null | string;
  exclude_tags: null | string;
  fee_post_account: null | number;
  fee_post_amount: number;
  fee_post_exempt_beneficiary_account: string | null;
  fee_post_exempt_beneficiary_weight: number;
  hive_community: null | string;
  hive_enabled: null | boolean;
  hive_engine_enabled: boolean;
  issue_token: boolean;
  json_metadata_app_value: string | null;
  json_metadata_key: string;
  json_metadata_value: string;
  max_auto_claim_amount: number;
  miner_tokens: string;
  mining_pool_claim_number: number;
  mining_pool_claims_per_year: number;
  muting_account: null | string;
  n_daily_posts_muted_accounts: number;
  other_pool_accounts: string;
  other_pool_percentage: number;
  other_pool_send_token_per_year: number;
  pob_comment_pool_percentage: number;
  pob_pool_percentage: number;
  posm_pool_percentage: number;
  post_reward_curve: string;
  post_reward_curve_parameter: null | number;
  promoted_post_account: string;
  reduction_every_n_block: number;
  reduction_percentage: number;
  rewards_token: number;
  rewards_token_every_n_block: number;
  staked_reward_percentage: number;
  staking_pool_claim_number: number;
  staking_pool_claims_per_year: number;
  staking_pool_percentage: number;
  steem_enabled: boolean;
  steem_engine_enabled: boolean;
  tag_adding_window_hours: number;
  token: string;
  token_account: string;
  use_staking_circulating_quotent: boolean;
  vote_power_consumption: number;
  vote_regeneration_seconds: number;
  vote_window_days: number;
}
export interface ScotVoteShare {
  authorperm: "";
  block_num: number;
  percent: number;
  revoted: any;
  rshares: number;
  timestamp: string;
  token: string;
  voter: string;
  weight: number;
}
async function getAuthorRep(feedData: Array<Entry>, useHive: boolean) {
  // Disable for now.
  const authors = Array.from(new Set(feedData.map((d) => d.author)));
  const authorRep: { [username: string]: unknown } = {};
  if (authors.length === 0) {
    return authorRep;
  }
  (await getAccounts(authors)).forEach((a) => {
    authorRep[a.name] = a.reputation;
  });
  return authorRep;
}
async function fetchMissingData(
  tag: string,
  feedType: string,
  state: any,
  feedData: Array<Entry>
) {
  /*
    if (!state.content) {
        state.content = {};
    }
    const missingKeys = feedData
        .filter(d => d.desc == null || d.children == null)
        .map(d => d.authorperm.substr(1))
        .filter(k => !state.content[k]);
    const missingContent = await Promise.all(
        missingKeys.map(k => {
            const authorPermlink = k.split('/');
            console.log('Unexpected missing: ' + authorPermlink);
            return getPost(
                authorPermlink[0],
                authorPermlink[1]
            );
        })
    );
    missingContent.forEach(c => {
        state.content[`${c.author}/${c.permlink}`] = c;
    });
    if (!state.discussion_idx) {
        state.discussion_idx = {};
    }
    const discussionIndex = [];
    const filteredContent  : {[authorperm:string]: ScotPost} = {};
    const authorRep = await getAuthorRep(feedData, useHive);
    feedData.forEach(d => {
        const key = d.authorperm.substr(1);
        if (!state.content[key]) {
            filteredContent[key] = {
                author_reputation: authorRep[d.author],
                body: d.desc,
                body_length: d.desc.length + 1,
                permlink: d.authorperm.split('/')[1],
                category: d.tags.split(',')[0],
                children: d.children,
                replies: [], // intentional
            };
        } else {
            filteredContent[key] = state.content[key];
        }
        mergeContent(filteredContent[key], d);
        discussionIndex.push(key);
    });
    state.content = filteredContent;
    if (!state.discussion_idx[tag]) {
        state.discussion_idx[tag] = {};
    }
    state.discussion_idx[tag][feedType] = discussionIndex;
     */
}
/*
async function addAccountToState(state, account, useHive) {
    const profile = await callBridge('get_profile', { account }, useHive);
    if (profile && profile['name']) {
        state['profiles'][account] = profile;
    }
}
export async function attachScotData(url, state, useHive, ssr = false) {
    let urlParts = url.match(
        /^(trending|hot|created|promoted|payout|payout_comments)($|\/([^\/]+)$)/
    );
    const scotTokenSymbol = LIQUID_TOKEN_UPPERCASE;
    if (urlParts) {
        const feedType = urlParts[1];
        const tag = urlParts[3] || '';
        const discussionQuery = {
            token: LIQUID_TOKEN_UPPERCASE,
            limit: 20,
        };
        if (tag) {
            discussionQuery.tag = tag;
        }
        let callName = `get_discussions_by_${feedType}`;
        if (feedType === 'payout_comments') {
            callName = 'get_comment_discussions_by_payout';
        }
        // first call feed.
        let feedData = await getScotDataAsync(callName, discussionQuery);
        await fetchMissingData(tag, feedType, state, feedData, useHive);
        return;
    }
    urlParts = url.match(/^[\/]?@([^\/]+)\/transfers[\/]?$/);
    if (urlParts) {
        const account = urlParts[1];
        if (ssr) {
            state['profiles'][account] = await getWalletAccount(
                account,
                useHive
            );
        }
        if (!state.props) {
            state.props = await getDynamicGlobalProperties();
        }
        return;
    }
    urlParts = url.match(/^[\/]?@([^\/]+)\/feed[\/]?$/);
    if (urlParts) {
        const account = urlParts[1];
        let feedData = await getScotDataAsync('get_feed', {
            token: LIQUID_TOKEN_UPPERCASE,
            tag: account,
            limit: 20,
        });
        await fetchMissingData(`@${account}`, 'feed', state, feedData, useHive);
        return;
    }
    urlParts = url.match(/^[\/]?@([^\/]+)(\/blog)?[\/]?$/);
    if (urlParts) {
        const account = urlParts[1];
        let feedData = await getScotDataAsync('get_discussions_by_blog', {
            token: LIQUID_TOKEN_UPPERCASE,
            tag: account,
            limit: 20,
            include_reblogs: true,
        });
        if (ssr) {
            await addAccountToState(state, account, useHive);
        }
        await fetchMissingData(`@${account}`, 'blog', state, feedData, useHive);
        return;
    }
    urlParts = url.match(/^[\/]?@([^\/]+)(\/posts)?[\/]?$/);
    if (urlParts) {
        const account = urlParts[1];
        let feedData = await getScotDataAsync('get_discussions_by_blog', {
            token: LIQUID_TOKEN_UPPERCASE,
            tag: account,
            limit: 20,
        });
        if (ssr) {
            await addAccountToState(state, account, useHive);
        }
        await fetchMissingData(
            `@${account}`,
            'posts',
            state,
            feedData,
            useHive
        );
        return;
    }
    urlParts = url.match(/^[\/]?@([^\/]+)(\/comments)?[\/]?$/);
    if (urlParts) {
        const account = urlParts[1];
        let feedData = await getScotDataAsync('get_discussions_by_comments', {
            token: LIQUID_TOKEN_UPPERCASE,
            tag: account,
            limit: 20,
        });
        if (ssr) {
            await addAccountToState(state, account, useHive);
        }
        await fetchMissingData(
            `@${account}`,
            'comments',
            state,
            feedData,
            useHive
        );
        return;
    }
    urlParts = url.match(/^[\/]?@([^\/]+)(\/replies)?[\/]?$/);
    if (urlParts) {
        const account = urlParts[1];
        let feedData = await getScotDataAsync('get_discussions_by_replies', {
            token: LIQUID_TOKEN_UPPERCASE,
            tag: account,
            limit: 20,
        });
        if (ssr) {
            await addAccountToState(state, account, useHive);
        }
        await fetchMissingData(
            `@${account}`,
            'replies',
            state,
            feedData,
            useHive
        );
        return;
    }
    if (state.content) {
        Object.entries(state.content).forEach(entry => {
            if (useHive) {
                entry[1].hive = true;
            }
        });
        // Do not do this merging except on client side.
        if (!ssr) {
            await Promise.all(
                Object.entries(state.content)
                    .filter(entry => {
                        return entry[0].match(/[a-z0-9\.-]+\/.*?/);
                    })
                    .map(async entry => {
                        const k = entry[0];
                        const v = entry[1];
                        // Fetch SCOT data
                        const scotData = await getScotDataAsync(`@${k}`, {
                            hive: useHive ? '1' : '',
                        });
                        mergeContent(
                            state.content[k],
                            scotData[LIQUID_TOKEN_UPPERCASE]
                        );
                    })
            );
            const filteredContent = {};
            Object.entries(state.content)
                .filter(
                    entry =>
                        (entry[1].scotData &&
                            entry[1].scotData[LIQUID_TOKEN_UPPERCASE]) ||
                        (entry[1].parent_author && entry[1].parent_permlink)
                )
                .forEach(entry => {
                    filteredContent[entry[0]] = entry[1];
                });
            state.content = filteredContent;
        }
    }
}
async function getContentFromBridge(author, permlink, useHive = true) {
    try {
        const content = getContentAsync(
            author,
            permlink
        );
        return await normalizePost(content);
    } catch (e) {
        console.log(e);
    }
    return null;
}
export async function getContentAsync(author :  string, permlink : string) {
    const [content, scotData] = await Promise.all([
        getPost(author, permlink),
        getScotDataAsync(`@${author}/${permlink}?hive=1`, {})
    ]);
    if (!content) {
        return content;
    }
    mergeContent(content, scotData[LIQUID_TOKEN_UPPERCASE]);
    return content;
}
export async function getCommunityStateAsync(
    url,
    observer,
    ssr = false,
    useHive = true
) {
    console.log('getStateAsync');
    if (observer === undefined) observer = null;
    const { page, tag, sort, key } = parsePath(url);
    console.log('GSA', url, observer, ssr);
    let state = {
        accounts: {},
        community: {},
        content: {},
        discussion_idx: {},
        profiles: {},
    };
    // load `content` and `discussion_idx`
    if (page == 'posts' || page == 'account') {
        const posts = await loadPosts(sort, tag, observer, useHive);
        state['content'] = posts['content'];
        state['discussion_idx'] = posts['discussion_idx'];
    } else if (page == 'thread') {
        const posts = await loadThread(key[0], key[1], useHive);
        state['content'] = posts['content'];
    } else {
        // no-op
    }
    // append `community` key
    if (tag && ifHivemind(tag)) {
        try {
            state['community'][tag] = await callBridge(
                'get_community',
                {
                    name: tag,
                    observer: observer,
                },
                useHive
            );
        } catch (e) {}
    }
    // for SSR, load profile on any profile page or discussion thread author
    const account =
        tag && tag[0] == '@'
            ? tag.slice(1)
            : page == 'thread' ? key[0].slice(1) : null;
    if (ssr && account) {
        // TODO: move to global reducer?
        const profile = await callBridge('get_profile', { account }, useHive);
        if (profile && profile['name']) {
            state['profiles'][account] = profile;
        }
    }
    if (ssr) {
        // append `topics` key
        state['topics'] = await callBridge(
            'get_trending_topics',
            {
                limit: 12,
            },
            useHive
        );
    }
    const cleansed = stateCleaner(state);
    return cleansed;
}
async function loadThread(account, permlink, useHive) {
    const author = account.slice(1);
    const content = await callBridge(
        'get_discussion',
        { author, permlink },
        useHive
    );
    if (content) {
        // Detect fetch with scot vs fetch with getState. We use body length vs body to tell
        // if it was a partial fetch. To clean up later.
        const k = `${author}/${permlink}`;
        content[k].body_length = content[k].body.length;
        const {
            content: preppedContent,
            keys,
            crossPosts,
        } = await fetchCrossPosts([Object.values(content)[0]], author, useHive);
        if (crossPosts) {
            const crossPostKey = content[keys[0]].cross_post_key;
            content[keys[0]] = preppedContent[keys[0]];
            content[keys[0]] = augmentContentWithCrossPost(
                content[keys[0]],
                crossPosts[crossPostKey]
            );
        }
    }
    return { content };
}
async function loadPosts(sort, tag, observer, useHive) {
    console.log('loadPosts');
    const account = tag && tag[0] == '@' ? tag.slice(1) : null;
    let posts;
    if (account) {
        const params = { sort, account, observer };
        posts = await callBridge('get_account_posts', params, useHive);
    } else {
        const params = { sort, tag, observer };
        posts = await callBridge('get_ranked_posts', params, useHive);
    }
    const { content, keys, crossPosts } = await fetchCrossPosts(
        posts,
        observer,
        useHive
    );
    if (Object.keys(crossPosts).length > 0) {
        for (let ki = 0; ki < keys.length; ki += 1) {
            const contentKey = keys[ki];
            let post = content[contentKey];
            if (Object.prototype.hasOwnProperty.call(post, 'cross_post_key')) {
                post = augmentContentWithCrossPost(
                    post,
                    crossPosts[post.cross_post_key]
                );
            }
        }
    }
    const discussion_idx = {};
    discussion_idx[tag] = {};
    discussion_idx[tag][sort] = keys;
    return { content, discussion_idx };
}
function parsePath(url) {
    // strip off query string
    url = url.split('?')[0];
    // strip off leading and trailing slashes
    if (url.length > 0 && url[0] == '/') url = url.substring(1, url.length);
    if (url.length > 0 && url[url.length - 1] == '/')
        url = url.substring(0, url.length - 1);
    // blank URL defaults to `trending`
    if (url === '') url = 'trending';
    const part = url.split('/');
    const parts = part.length;
    const sorts = [
        'trending',
        'promoted',
        'hot',
        'created',
        'payout',
        'payout_comments',
        'muted',
    ];
    const acct_tabs = [
        'blog',
        'feed',
        'posts',
        'comments',
        'replies',
        'payout',
    ];
    let page = null;
    let tag = null;
    let sort = null;
    let key = null;
    if (parts == 1 && sorts.includes(part[0])) {
        page = 'posts';
        sort = part[0];
        tag = '';
    } else if (parts == 2 && sorts.includes(part[0])) {
        page = 'posts';
        sort = part[0];
        tag = part[1];
    } else if (parts == 3 && part[1][0] == '@') {
        page = 'thread';
        tag = part[0];
        key = [part[1], part[2]];
    } else if (parts == 1 && part[0][0] == '@') {
        page = 'account';
        sort = 'blog';
        tag = part[0];
    } else if (parts == 2 && part[0][0] == '@') {
        if (acct_tabs.includes(part[1])) {
            page = 'account';
            sort = part[1];
        } else {
            // settings, followers, notifications, etc (no-op)
        }
        tag = part[0];
    } else {
        // no-op URL
    }
    return { page, tag, sort, key };
}
export async function getStateAsync(url, observer, ssr = false) {
    // strip off query string
    let path = url.split('?')[0];
    // strip off leading and trailing slashes
    if (path.length > 0 && path[0] == '/')
        path = path.substring(1, path.length);
    if (path.length > 0 && path[path.length - 1] == '/')
        path = path.substring(0, path.length - 1);
    // Steemit state not needed for main feeds.
    const steemitApiStateNeeded =
        path !== '' &&
        !path.match(/^(login|submit)\.html$/) &&
        !path.match(
            /^(trending|hot|created|promoted|payout|payout_comments)($|\/([^\/]+)$)/
        ) &&
        !path.match(
            /^@[^\/]+(\/(feed|blog|comments|recent-replies|transfers|posts|replies|followers|followed)?)?$/
        );
    let raw = {
        accounts: {},
        community: {},
        content: {},
        discussion_idx: {},
        profiles: {},
    };
    let useHive = false;
    if (steemitApiStateNeeded) {
        // First get Hive state
        if (DISABLE_HIVE) {
            console.log('Fetching state from hive.');
            raw = await getCommunityStateAsync(url, observer, ssr, false);
        } else {
            try {
                const hiveState = await getCommunityStateAsync(
                    url,
                    observer,
                    ssr,
                    true
                );
                if (
                    hiveState &&
                    (Object.keys(hiveState.content).length > 0 ||
                        path.match(/^login\/hivesigner/))
                ) {
                    raw = hiveState;
                    useHive = true;
                }
            } catch (e) {
                console.log(e);
            }
            if (!useHive) {
                console.log('Fetching state from hive.');
                raw = await getCommunityStateAsync(url, observer, ssr, false);
            }
        }
    } else {
        // Use Prefer HIVE setting
        useHive = PREFER_HIVE;
    }
    if (!raw.accounts) {
        raw.accounts = {};
    }
    if (!raw.content) {
        raw.content = {};
    }
    await attachScotData(path, raw, useHive, ssr);
    const cleansed = stateCleaner(raw);
    return cleansed;
}
export async function fetchFeedDataAsync(useHive, call_name, args) {
    const fetchSize = args.limit;
    let feedData;
    // To indicate if there are no further pages in feed.
    let endOfData;
    // To indicate last fetched value from API.
    let lastValue;
    const callNameMatch = call_name.match(
        /getDiscussionsBy(Trending|Hot|Created|Promoted|Blog|Feed|Comments|Replies)Async/
    );
    let order;
    let callName;
    let discussionQuery = {
        ...args,
        token: LIQUID_TOKEN_UPPERCASE,
    };
    if (callNameMatch) {
        order = callNameMatch[1].toLowerCase();
        if (order == 'feed') {
            callName = 'get_feed';
        } else {
            callName = `get_discussions_by_${order}`;
        }
    } else if (call_name === 'getPostDiscussionsByPayoutAsync') {
        callName = 'get_discussions_by_payout';
    } else if (call_name === 'getCommentDiscussionsByPayoutAsync') {
        callName = 'get_comment_discussions_by_payout';
    } else if (call_name === 'get_account_posts') {
        if (args.sort === 'blog') {
            order = 'blog';
            callName = 'get_discussions_by_blog';
            discussionQuery.include_reblogs = true;
        } else if (args.sort === 'posts') {
            order = 'blog';
            callName = 'get_discussions_by_blog';
        } else if (args.sort === 'feed') {
            order = 'feed';
            callName = 'get_feed';
            discussionQuery.include_reblogs = true;
        } else if (args.sort === 'replies') {
            order = 'replies';
            callName = 'get_discussions_by_replies';
        } else if (args.sort === 'comments') {
            order = 'comments';
            callName = 'get_discussions_by_comments';
        }
        discussionQuery.tag = discussionQuery.account;
        delete discussionQuery.account;
        delete discussionQuery.sort;
    }
    if (callName) {
        if (!discussionQuery.tag) {
            // If empty string, remove from query.
            delete discussionQuery.tag;
        }
        feedData = await getScotDataAsync(callName, discussionQuery);
        feedData = await Promise.all(
            feedData.map(async scotData => {
                const authorPermlink = scotData.authorperm.substr(1).split('/');
                let content;
                if (scotData.desc == null || scotData.children == null) {
                    content = await (useHive
                        ? hive.api
                        : hive.api
                    ).getContentAsync(authorPermlink[0], authorPermlink[1]);
                } else {
                    content = {
                        body: scotData.desc,
                        body_length: scotData.desc.length + 1,
                        permlink: scotData.authorperm.split('/')[1],
                        category: scotData.tags.split(',')[0],
                        children: scotData.children,
                        replies: [], // intentional
                    };
                }
                mergeContent(content, scotData);
                return content;
            })
        );
        // fill in author rep
        const authorRep = await getAuthorRep(feedData, useHive);
        feedData.forEach(d => {
            d.author_reputation = authorRep[d.author];
        });
        // this indicates no further pages in feed.
        endOfData = feedData.length < fetchSize;
        lastValue = feedData.length > 0 ? feedData[feedData.length - 1] : null;
    } else {
        feedData = await (useHive ? hive.api : hive.api)[call_name](args);
        feedData = await Promise.all(
            feedData.map(async post => {
                const k = `${post.author}/${post.permlink}`;
                const scotData = await getScotDataAsync(`@${k}`);
                mergeContent(post, scotData[LIQUID_TOKEN_UPPERCASE]);
                return post;
            })
        );
        // endOfData check and lastValue setting should go before any filtering,
        endOfData = feedData.length < fetchSize;
        lastValue = feedData.length > 0 ? feedData[feedData.length - 1] : null;
        feedData = feedData.filter(
            post => post.scotData && post.scotData[LIQUID_TOKEN_UPPERCASE]
        );
    }
    return { feedData, endOfData, lastValue };
}
*/
export async function fetchSnaxBalanceAsync(account: string) {
  const url = "https://cdn.snax.one/v1/chain/get_currency_balance";
  const data = {
    code: "snax.token",
    symbol: "SNAX",
    account,
  };
  return await axios
    .post(url, data, {
      headers: { "content-type": "text/plain" },
    })
    .then((response) => response.data)
    .catch((err) => {
      console.error(`Could not fetch data, url: ${url}`);
      return [];
    });
}
export interface ScotPost {
  active_votes: Array<ScotVoteShare>;
  app: string;
  author: string;
  author_curve_exponent: number;
  author_payout_beneficiaries: string;
  authorperm: string;
  beneficiaries_payout_value: number;
  block: number;
  cashout_time: string;
  children: number;
  created: string;
  curator_payout_value: number;
  decline_payout: boolean;
  desc: string;
  hive: boolean;
  json_metadata: string;
  last_payout: string;
  last_update: string;
  main_post: boolean;
  muted: boolean;
  parent_author: "";
  parent_permlink: string;
  pending_token?: number;
  precision: number;
  promoted: number;
  score_hot: number;
  score_promoted: number;
  score_trend: number;
  tags: string;
  title: string;
  token: string;
  total_payout_value?: number;
  total_vote_weight: number;
  vote_rshares: number;
}
export interface MergedEntry {
  active_votes: { [tokenName: string]: Array<ScotVoteShare> };
  app?: string;
  author: string;
  author_curve_exponent: { [coinname: string]: number };
  author_payout_beneficiaries: string;
  authorperm?: string;
  author_payout_value: string;
  author_reputation: number;
  author_role?: string;
  author_title?: string;
  beneficiaries: EntryBeneficiaryRoute[];
  beneficiaries_payout_value?: number;
  block?: number;
  cashout_time?: string;
  blacklists: string[];
  body: string;
  category: string;
  children: number; // the same for both HE and Hive, right?
  community?: string;
  community_title?: string;
  created: string;
  curator_payout_value: string;
  decline_payout?: boolean;
  desc?: string;
  depth: number;
  hive: boolean;
  is_paidout: boolean;
  json_metadata: string;
  last_payout?: string;
  last_update?: string;
  main_post?: boolean;
  max_accepted_payout: string;
  muted: boolean;
  net_rshares: number;
  parent_author?: string;
  original_entry?: Entry;
  parent_permlink?: string;
  payout: number;
  payout_at: string;
  pending_payout_value: string;
  pending_token?: number;
  percent_hbd: number;
  permlink: string;
  post_id: number;
  precision?: number;
  score_hot?: number;
  score_promoted?: number;
  score_trend?: number;
  tags?: string;
  token?: string;
  total_payout_value?: number;
  total_vote_weight?: number;
  vote_rshares?: number;
  promoted: number;
  reblogged_by?: string[];
  replies: any[];
  stats?: EntryStat;
  updated: string;
  url: string;
}
export interface MergedEntry {
  active_votes: { [tokenName: string]: Array<ScotVoteShare> };
  app?: string;
  author: string;
  author_curve_exponent: { [coinname: string]: number };
  author_payout_beneficiaries: string;
  authorperm?: string;
  author_payout_value: string;
  author_reputation: number;
  author_role?: string;
  author_title?: string;
  beneficiaries: EntryBeneficiaryRoute[];
  beneficiaries_payout_value?: number;
  block?: number;
  cashout_time?: string;
  blacklists: string[];
  body: string;
  category: string;
  children: number; // the same for both HE and Hive, right?
  community?: string;
  community_title?: string;
  created: string;
  curator_payout_value: string;
  decline_payout?: boolean;
  desc?: string;
  depth: number;
  hive: boolean;
  is_paidout: boolean;
  json_metadata: string;
  last_payout?: string;
  last_update?: string;
  main_post?: boolean;
  max_accepted_payout: string;
  muted: boolean;
  net_rshares: number;
  parent_author?: string;
  original_entry?: Entry;
  parent_permlink?: string;
  payout: number;
  payout_at: string;
  pending_payout_value: string;
  pending_token?: number;
  percent_hbd: number;
  permlink: string;
  post_id: number;
  precision?: number;
  score_hot?: number;
  score_promoted?: number;
  score_trend?: number;
  tags?: string;
  token?: string;
  total_payout_value?: number;
  total_vote_weight?: number;
  vote_rshares?: number;
  promoted: number;
  reblogged_by?: string[];
  replies: any[];
  stats?: EntryStat;
  updated: string;
  url: string;
}
export const historicalPOBInfo: HiveEngineTokenInfo = {
  claimed_token: 66024178279461,
  comment_pending_rshares: 81513634111,
  comment_reward_pool: 0,
  enable_automatic_account_claim: false,
  enable_comment_reward_pool: false,
  enabled: true,
  enabled_services: null,
  hive: false,
  inflation_tools: 1,
  issued_token: null,
  issuer: "proofofbrainio",
  last_compute_post_reward_block_num: 54518069,
  last_mining_claim_block_num: null,
  last_mining_claim_trx: null,
  last_other_accounts_transfer_block_num: 0,
  last_processed_mining_claim_block_num: 0,
  last_processed_staking_claim_block_num: 0,
  last_reduction_block_num: 51653521,
  last_reward_block_num: 54518069,
  last_rshares2_decay_time: "Sat, 05 Jun 2021 15:03:00 GMT",
  last_staking_claim_block_num: null,
  last_staking_claim_trx: null,
  last_staking_mining_update_block_num: null,
  mining_enabled: false,
  mining_reward_pool: 0,
  next_mining_claim_number: 0,
  next_staking_claim_number: 0,
  other_reward_pool: 0,
  pending_rshares: 5463949711220131,
  pending_token: -17072321490592,
  precision: 8,
  reward_pool: 8581158633809,
  rewards_token: 1000000000,
  setup_complete: 2,
  staked_mining_power: 0,
  staked_token: 58387881879788,
  staking_enabled: false,
  staking_reward_pool: 0,
  start_block_num: 51653521,
  start_date: "Sun, 28 Feb 2021 00:11:39 GMT",
  symbol: "POB",
  total_generated_token: 66279700000000,
  voting_enabled: true,
};
export const historicalPOBConfig: HiveEngineTokenConfig = {
  allowlist_account: null,
  author_curve_exponent: 1,
  author_reward_percentage: 50,
  badge_fee: -1,
  beneficiaries_account: "h@proofofbrainio",
  beneficiaries_reward_percentage: 10,
  cashout_window_days: 7,
  curation_curve_exponent: 1,
  disable_downvoting: false,
  downvote_power_consumption: 2000,
  downvote_regeneration_seconds: 432000,
  downvote_window_days: -1,
  enable_account_allowlist: null,
  enable_account_muting: true,
  enable_comment_beneficiaries: true,
  exclude_apps: null,
  exclude_apps_from_token_beneficiary: "",
  exclude_beneficiaries_accounts:
    "likwid,finex,sct.krwp,h@likwid,h@finex,h@sct.krwp,rewarding.app,h@rewarding.app",
  exclude_tags: "actifit,steemhunt,appics,dlike,share2steem",
  fee_post_account: null,
  fee_post_amount: 0,
  fee_post_exempt_beneficiary_account: null,
  fee_post_exempt_beneficiary_weight: 0,
  hive_community: "hive-150329",
  hive_enabled: true,
  hive_engine_enabled: true,
  issue_token: true,
  json_metadata_app_value: null,
  json_metadata_key: "tags",
  json_metadata_value: "proofofbrain,pob",
  max_auto_claim_amount: -1,
  miner_tokens: "{}",
  mining_pool_claim_number: 0,
  mining_pool_claims_per_year: 0,
  muting_account: "proofofbrainio",
  n_daily_posts_muted_accounts: 0,
  other_pool_accounts: "{}",
  other_pool_percentage: 0,
  other_pool_send_token_per_year: 0,
  pob_comment_pool_percentage: 0,
  pob_pool_percentage: 100,
  posm_pool_percentage: 0,
  post_reward_curve: "default",
  post_reward_curve_parameter: null,
  promoted_post_account: "null",
  reduction_every_n_block: 42000000,
  reduction_percentage: 50,
  rewards_token: 10,
  rewards_token_every_n_block: 40,
  staked_reward_percentage: 0,
  staking_pool_claim_number: 0,
  staking_pool_claims_per_year: 0,
  staking_pool_percentage: 0,
  steem_enabled: false,
  steem_engine_enabled: false,
  tag_adding_window_hours: 1,
  token: "POB",
  token_account: "proofofbrainio",
  use_staking_circulating_quotent: false,
  vote_power_consumption: 200,
  vote_regeneration_seconds: 432000,
  vote_window_days: 7,
};

const moreLocks = (input: {
  [apiName: string]: {
    liquidLong: string;
    stakedLong: string;
    stakedShort: StakedAsset | "";
    liquidShort: LiquidAsset;
  };
}): {
  [apiName: string]: {
    liquidLong: string;
    stakedLong: string;
    stakedShort: StakedAsset | "";
    liquidShort: LiquidAsset;
  };
} => {
  for (const key in input) {
    if (input[key].stakedShort != "")
      input[input[key].stakedShort] = input[key];
  }
  return input;
};

export const tokenAliases: {
  [apiName: string]: {
    liquidLong: string;
    stakedLong: string;
    stakedShort: StakedAsset | "";
    liquidShort: LiquidAsset;
  };
} = moreLocks({
  POINT: {
    liquidLong: "POINT",
    liquidShort: "POINT",
    stakedShort: "",
    stakedLong: "",
  },

  POB: {
    liquidLong: "Proof of Brain",
    stakedLong: "Brain Power",
    stakedShort: "BP",
    liquidShort: "POB",
  },

  VYB: {
    liquidLong: "Verify Your Brain",
    stakedLong: "Verification Power",
    stakedShort: "VP",
    liquidShort: "VYB",
  },

  HBD: {
    liquidLong: "Hive Dollars",
    stakedLong: "",
    stakedShort: "",
    liquidShort: "HBD",
  },

  TEST: {
    liquidLong: "Test",
    stakedLong: "Test Power",
    stakedShort: "TP",
    liquidShort: "TEST",
  },

  TP: {
    liquidLong: "Test",
    stakedLong: "Test Power",
    stakedShort: "TP",
    liquidShort: "TEST",
  },

  HIVE: {
    liquidLong: "Hive",
    stakedLong: "Hive Power",
    stakedShort: "HP",
    liquidShort: "HIVE",
  },

  HP: {
    liquidLong: "Hive",
    stakedLong: "Hive Power",
    stakedShort: "HP",
    liquidShort: "HIVE",
  },

  WEED: {
    liquidLong: "Weed Cash",
    stakedLong: "Weed Power",
    liquidShort: "WEED",
    stakedShort: "WP",
  },

  WP: {
    liquidLong: "Weed Cash",
    stakedLong: "Weed Power",
    liquidShort: "WEED",
    stakedShort: "WP",
  },

  "SWAP.HIVE": {
    liquidLong: "Hive on Hive Engine",
    stakedLong: "",
    liquidShort: "SWAP.HIVE",
    stakedShort: "",
  },

  "SWAP.HBD": {
    liquidLong: "Hive Backed Dollars on Hive Engine",
    stakedLong: "",
    liquidShort: "HBD",
    stakedShort: "",
  },
});
