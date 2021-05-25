/*
import o2j from 'shared/clash/object2json';
import { ifHivemind } from 'app/utils/Community';
import stateCleaner from 'app/redux/stateCleaner';
import {
    fetchCrossPosts,
    augmentContentWithCrossPost,
} from './util/CrossPosts';
*/
import {DISABLE_HIVE, LIQUID_TOKEN_UPPERCASE} from '../../client_config';

import axios from 'axios';
// @ts-ignore
import SSC from "sscjs";
import {HECoarseTransaction, HEFineTransaction} from "../store/transactions/types";
import {getAccount, getFollowCount} from "./hive";
import {AccountFollowStats, FullAccount} from "../store/accounts/types";

const ssc = new SSC('https://api.hive-engine.net/rpc');
const hiveSsc = new SSC('https://api.hive-engine.com/rpc');

interface TokenStatusMap {
    "downvote_weight_multiplier":number;
    "downvoting_power":number;
    "earned_mining_token":number;
    "earned_other_token":number;
    "earned_staking_token":number;
    "earned_token":number;
    "hive":boolean;
    "last_downvote_time":string;
    "last_follow_refresh_time":string;
    "last_post":string;
    "last_root_post":string;
    "last_vote_time":string;
    "last_won_mining_claim":string;
    "last_won_staking_claim":string;
    "loki":null|unknown,
    "muted":boolean;
    "name":string;
    "pending_token":number;
    "precision":number;
    "staked_mining_power":number;
    "staked_tokens":number;
    "symbol":string;
    "vote_weight_multiplier":number;
    "voting_power":number;

}

// Hopefully we can make this dynamic some soon
const defaultPrices = {
	'POB': 0.83,
	'LEO': 0.32,
	'SWAP.BTC': 40345,
	'SWAP.HIVE': 0.4 
};

export async function getPrices(token_list: undefined|Array<string>) : Promise<{[shortCoinName: string]: number /* in Hive */}> {
	try {
	    let obj : any = {};
		const HIVEpPOB = parseFloat((await hiveSsc.find('market', 'tradesHistory', {
				'symbol': 'POB',
				'type': 'buy',
		}))[0].price);
		const HIVEpLEO = parseFloat((await hiveSsc.find('market', 'tradesHistory', {
				'symbol': 'LEO',
				'type': 'buy',
		}))[0].price);

		obj = {
            'POB': HIVEpPOB,
            'LEO': HIVEpLEO,
            'SWAP.HIVE': 1,
        };

		try {
            obj['SWAP.BTC'] = parseFloat((await hiveSsc.find('market', 'tradesHistory', {
                'symbol': 'SWAP.BTC',
                'type': 'buy',
            }))[0].price);
        } catch (e) {
		    // do nothing....
        }

        try {
		    // others
            const others = await hiveSsc.find('market', 'tradesHistory', {
                'type': 'buy',
            });
            for (const other of others) {
                obj[other.symbol] = parseFloat(other.price);
            }
        } catch (e) {
		    console.log(e);
		    // do nothing...
        }


			
		return obj;
	} catch (e) {
		console.log(e.message);
	}
	
	return defaultPrices;
}

interface RawTokenBalance {
    _id: number,
    account: string,
    symbol: string,
    balance: string,
    stake: string,
    pendingUnstake: string,
    delegationsIn: string,
    delegationsOut: string,
    pendingUndelegations: string
}


export interface TokenBalance {
    _id: number,
    account: string,
    symbol: string,
    balance: number,
    stake: number,
    pendingUnstake: number,
    delegationsIn: number,
    delegationsOut: number,
    pendingUndelegations: number
}

export interface CoinDescription {
    "downvote_weight_multiplier": number;
    "downvoting_power": number;
    "earned_mining_token": number;
    "earned_other_token": number;
    "earned_staking_token": number;
    "earned_token": number;
    "hive": boolean;
    "last_downvote_time": string;
    "last_follow_refresh_time": string;
    "last_post": string;
    "last_root_post": string;
    "last_vote_time": string;
    "last_won_mining_claim": string;
    "last_won_staking_claim": string;
    "loki": any|null;
    "muted": boolean;
    "name": string;
    "pending_token": number;
    "precision": number;
    "staked_mining_power": number;
    "staked_tokens": number;
    "symbol": string;
    "vote_weight_multiplier": number;
    "voting_power": number;
}

export interface FullHiveEngineAccount extends FullAccount {
    follow_stats: AccountFollowStats |undefined;
    token_balances: Array<TokenBalance>;
    token_unstakes: Array<unknown>;
    token_statuses: {data: TokenStatusMap, hiveData: TokenStatusMap | null};
    transfer_history: undefined|null|Array<HEFineTransaction>;
    token_delegations: any; /* seems to be undefined sometimes */
    prices: any;
}

async function callApi(url : string, params: any) {
    return await axios({
        url,
        method: 'GET',
        params,
    })
        .then(response => {
            return response.data;
        })
        .catch(err => {
            console.error(`Could not fetch data, url: ${url}`, JSON.stringify(err));
            return [];
        });
}

// Exclude author and curation reward details
async function getCoarseTransactionHistory(account: string, limit: 50, offset: number = 0) {
    const transfers : Array<HECoarseTransaction> = await callApi(
        'https://accounts.hive-engine.com/accountHistory',
        {
            account,
            limit,
            offset,
            type: 'user',
            symbol: LIQUID_TOKEN_UPPERCASE,
        }
    );
    return transfers;
}

// Include virtual transactions like curation and author reward details.
async function getFineTransactions(account : string, limit: number, offset: number)  : Promise<Array<HEFineTransaction>> {
    const history : Array<HEFineTransaction> = await getScotDataAsync<Array<HEFineTransaction>>('get_account_history', {
        account,
        token: LIQUID_TOKEN_UPPERCASE,
        limit,
        offset,
    });
    return history;
}

export async function getScotDataAsync<T>(path : string, params : object) : Promise<any> {
    const x : T= await callApi(`https://scot-api.hive-engine.com/${path}`, params);
    return x;
}

export async function getScotAccountDataAsync(account: string) {
    const data = await getScotDataAsync(`@${account}`, {});
    const hiveData = DISABLE_HIVE
        ? null
        : await getScotDataAsync(`@${account}`, { hive: 1 });
    return { data, hiveData };
}




export async function getAccountHEFull(account : string, useHive: boolean) : Promise<FullHiveEngineAccount> {
    let hiveAccount: FullAccount, tokenBalances: Array<object>, tokenUnstakes: Array<object>,
        tokenStatuses: { data: TokenStatusMap; hiveData: TokenStatusMap| null }, transferHistory: any, tokenDelegations: any;
    [
        hiveAccount,
        tokenBalances,

        tokenUnstakes,

        tokenStatuses,
        transferHistory,
        tokenDelegations,
    ] = await Promise.all([
        getAccount(account),
        // modified to get all tokens. - by anpigon
        hiveSsc.find('tokens', 'balances', {
            account,
        }),
        hiveSsc.find('tokens', 'pendingUnstakes', {
            account,
            symbol: LIQUID_TOKEN_UPPERCASE,
        }),
        getScotAccountDataAsync(account),
        getFineTransactions(account, 100, 0),
        hiveSsc.find('tokens', 'delegations', {
            $or: [{from: account}, {to: account}],
            symbol: LIQUID_TOKEN_UPPERCASE,
        }),
    ]);
    let modifiedTokenBalances : Array<TokenBalance> = [];
   // There is no typesafe way to modify the type of something
   // in place.  You have to do a typecast eventually or participate in
   // copying.
   for (const tokenBalance of tokenBalances) {
       const b = tokenBalance;
       if (typeof(b['_id']) !== 'number'
        ||
           typeof(b['symbol']) !== 'string'
           ||
           typeof(b['balance']) !== 'string'
           ||
           typeof(b['stake']) !== 'string'
       )
           continue;
       const b2: RawTokenBalance = b as RawTokenBalance;
       // pass by reference semantics modifies the array.
       // This is on purpose.
       try {
           // @ts-ignore
           const b1: TokenBalance = Object.assign(b, {
               "delegationsIn": parseFloat(b2.delegationsIn),
               "balance": parseFloat(b2.balance),
               "stake": parseFloat(b2.stake),
               "delegationsOut": parseFloat(b2.delegationsOut),
               "pendingUndelegations": parseFloat(b2.pendingUndelegations),
               "pendingUnstake": parseFloat(b2.pendingUndelegations)
           });
           modifiedTokenBalances.push(b1);
       } catch (e) {

       }

   }
   // Now tokenBalances is an Array<TokenBalance>.
    const prices = await getPrices(Object.keys(tokenBalances));
    let follow_stats: AccountFollowStats | undefined;
    try {
        follow_stats = await getFollowCount(account);
    } catch (e) {

    }

    return {...hiveAccount, follow_stats, token_balances: modifiedTokenBalances, token_unstakes: tokenUnstakes,
            token_statuses: tokenStatuses, transfer_history: transferHistory, token_delegations: tokenDelegations, prices  };
}

/*
async function getAuthorRep(feedData : Array<Comment>, useHive : boolean) {
    // Disable for now.
    const authors = Array.from(new Set(feedData.map(d => d.author)));
    const authorRep : {[username: string] : unknown} = {};
    if (authors.length === 0) {
        return authorRep;
    }
    (await (useHive ? hive.api : hive.api).getAccountsAsync(authors)).forEach(
        a => {
            authorRep[a.name] = a.reputation;
        }
    );
    return authorRep;
    
}

function mergeContent(content, scotData) {
    const parentAuthor = content.parent_author;
    const parentPermlink = content.parent_permlink;
    const voted = content.active_votes;
    const lastUpdate = content.last_update;
    const title = content.title;
    Object.assign(content, scotData);
    if (voted) {
        const scotVoted = new Set(content.active_votes.map(v => v.voter));
        voted.forEach(v => {
            if (!scotVoted.has(v.voter)) {
                content.active_votes.push({
                    voter: v.voter,
                    percent: Math.sign(v.rshares),
                    rshares: 0,
                });
            }
        });
    }
    // Restore currently buggy fields
    if (lastUpdate) {
        content.last_update = lastUpdate;
    }
    if (title) {
        content.title = title;
    }
    // Prefer parent author / permlink of content
    content.parent_author = parentAuthor;
    content.parent_permlink = parentPermlink;

    content.scotData = {};
    content.scotData[LIQUID_TOKEN_UPPERCASE] = scotData;

    content.json_metadata = o2j.ifStringParseJSON(content.json_metadata);
}


async function fetchMissingData(tag, feedType, state, feedData, useHive) {
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
            return (useHive ? hive.api : hive.api).getContentAsync(
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
    const filteredContent = {};
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
}

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

export async function fetchSnaxBalanceAsync(account : string) {
    const url = 'https://cdn.snax.one/v1/chain/get_currency_balance';
    const data = {
        code: 'snax.token',
        symbol: 'SNAX',
        account,
    };
    return await axios
        .post(url, data, {
            headers: { 'content-type': 'text/plain' },
        })
        .then(response => response.data)
        .catch(err => {
            console.error(`Could not fetch data, url: ${url}`);
            return [];
        });
}
*/
