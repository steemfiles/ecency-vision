import moment from "moment";

const defensive = false;
export enum NotificationFilter {
  VOTES = "rvotes",
  MENTIONS = "mentions",
  FOLLOWS = "follows",
  REPLIES = "replies",
  REBLOGS = "reblogs",
  TRANSFERS = "transfers",
}

interface BaseWsNotification {
  source: string;
  target: string;
  timestamp: string;
}

export interface WsVoteNotification extends BaseWsNotification {
  type: "vote";
  extra: {
    permlink: string;
    weight: number;
    title: string | null;
    img_url: string | null;
  };
}

export interface WsMentionNotification extends BaseWsNotification {
  type: "mention";
  extra: {
    permlink: string;
    is_post: 0 | 1;
    title: string | null;
    img_url: string | null;
  };
}

export interface WsFollowNotification extends BaseWsNotification {
  type: "follow";
  extra: {
    what: string[];
  };
}

export interface WsReplyNotification extends BaseWsNotification {
  type: "reply";
  extra: {
    title: string;
    body: string;
    json_metadata: string;
    permlink: string;
    parent_author: string;
    parent_permlink: string;
    parent_title: string | null;
    parent_img_url: string | null;
  };
}

export interface WsReblogNotification extends BaseWsNotification {
  type: "reblog";
  extra: {
    permlink: string;
    title: string | null;
    img_url: string | null;
  };
}

export interface WsTransferNotification extends BaseWsNotification {
  type: "transfer";
  extra: {
    amount: string;
    memo: string;
  };
}

export interface WsSpinNotification extends BaseWsNotification {
  type: "spin";
}

export interface WsInactiveNotification extends BaseWsNotification {
  type: "inactive";
}

export interface WsReferralNotification extends BaseWsNotification {
  type: "referral";
}

export type WsNotification =
  | WsVoteNotification
  | WsMentionNotification
  | WsFollowNotification
  | WsReplyNotification
  | WsReblogNotification
  | WsTransferNotification
  | WsSpinNotification
  | WsInactiveNotification
  | WsReferralNotification;

// HTTP api notification types

interface BaseAPiNotification {
  id: string;
  source: string;
  read: 0 | 1;
  timestamp: string; // iso formatted date
  ts: number; // unix timestamp
  gk: string; // group key
  gkf: boolean; // group key flag. true when a new group started
}

function ToGroup(ts: number, timestamp: string): string {
  const hour = 3600000;
  const nowDate = new Date();
  const thenDate = new Date(ts);
  const diff: number = (nowDate.getTime() - ts) / hour;
  const day = 24;
  if (diff < 1) {
    return "recent";
  } else if (diff < 24 && nowDate.getDay() == thenDate.getDay()) {
    return Math.floor(diff) + " hours";
  } else if (
    diff < 96 &&
    [-6, 1].includes(nowDate.getDay() - thenDate.getDay())
  ) {
    return "Yesterday";
  } else {
    const date = timestamp.split(/T/)[0];
    return date;
  }
}

export interface ApiVoteNotification extends BaseAPiNotification {
  type: "vote" | "unvote";
  voter: string;
  weight: number;
  author: string;
  permlink: string;
  title: string | null;
  img_url: string | null;
}

export interface ApiMentionNotification extends BaseAPiNotification {
  type: "mention";
  author: string;
  account: string;
  permlink: string;
  post: boolean;
  title: string | null;
  img_url: string | null;
}

export interface ApiFollowNotification extends BaseAPiNotification {
  type: "follow" | "unfollow" | "ignore";
  follower: string;
  following: string;
  blog: boolean;
}

export interface ApiReblogNotification extends BaseAPiNotification {
  type: "reblog";
  account: string;
  author: string;
  permlink: string;
  title: string | null;
  img_url: string | null;
}

export interface ApiReplyNotification extends BaseAPiNotification {
  type: "reply";
  author: string;
  permlink: string;
  title: string;
  body: string;
  json_metadata: string;
  metadata: any;
  parent_author: string;
  parent_permlink: string;
  parent_title: string | null;
  parent_img_url: string | null;
}

export interface ApiTransferNotification extends BaseAPiNotification {
  type: "transfer";
  to: string;
  amount: string;
  memo: string | null;
}

export interface ApiSpinNotification extends BaseAPiNotification {
  type: "spin";
}

export interface ApiInactiveNotification extends BaseAPiNotification {
  type: "inactive";
}

export interface ApiReferralNotification extends BaseAPiNotification {
  type: "referral";
}

export type ApiNotification =
  | ApiVoteNotification
  | ApiMentionNotification
  | ApiFollowNotification
  | ApiReblogNotification
  | ApiReplyNotification
  | ApiTransferNotification
  | ApiSpinNotification
  | ApiInactiveNotification
  | ApiReferralNotification;

export function process(
  rh: { [id: string]: any },
  rn: Array<any>,
  username: string
) {
  let notifications: Array<ApiNotification> = [];
  let lastReadTime: null | number = null;
  if (defensive && !rh.history) {
    console.log("abnormally returning early because rh.history is undefined", {
      rh,
      rn,
    });
    return notifications;
  }

  for (const h of rh.history) {
    // the most recent first
    // @ts-ignore
    const { op, timestamp } = h[1];
    const { type, value } = op;
    const ts = new Date(timestamp).getTime();
    if (type == "vote_operation") {
      const { weight, permlink, author, voter } = value;
      if (author != username) continue;
      const vp: ApiVoteNotification = {
        id: `voter ${voter} voted for ${author}/${permlink} at ${timestamp}`,
        timestamp,
        source: voter,
        read: lastReadTime !== null && lastReadTime < ts ? 1 : 0,
        ts,
        gk: ToGroup(ts, timestamp),
        gkf: false,
        type: weight === 0 ? "unvote" : "vote",
        voter,
        weight,
        author,
        permlink,
        title: null,
        img_url: null,
      };

      notifications.push(vp);
    } else if (type === "comment_operation") {
      const {
        author,
        permlink,
        parent_author,
        parent_permlink,
        title,
        body,
        json_metadata,
      } = value;
      if (username === author) continue;
      try {
        const cp: ApiReplyNotification = {
          id: `The user ${author} replied with ${author}/${permlink} at ${timestamp}`,
          timestamp,
          source: author,
          read: lastReadTime !== null && lastReadTime < ts ? 1 : 0,
          ts,
          gk: ToGroup(ts, timestamp),
          gkf: false,
          type: "reply",
          parent_author,
          permlink,
          title,
          body,
          json_metadata,
          parent_permlink,
          author,
          metadata: JSON.parse(json_metadata),
          parent_title: null,
          parent_img_url: null,
        };
        notifications.push(cp);
      } catch (e) {}
    } else if (type === "transfer_operation") {
      const { from, to, amount, memo } = value;
      if (username === from) continue;
      const { nai, precision } = amount;
      const tn: ApiTransferNotification = {
        id: `${from} transfered to ${to} @ ${timestamp}`,
        timestamp,
        source: from,
        read: lastReadTime !== null && lastReadTime < ts ? 1 : 0,
        ts,
        gk: ToGroup(ts, timestamp),
        gkf: false,
        type: "transfer",
        to,
        amount:
          parseInt(amount.amount) * Math.pow(10, -precision) +
          (amount.nai === "@@000000013"
            ? " HBD"
            : nai === "@@000000021"
            ? " Hive"
            : " Unknown Currency"),
        memo,
      };
      notifications.push(tn);
    } else if (type === "custom_json_operation") {
      const { id, json } = value;
      if (id === "notify" && lastReadTime !== null && lastReadTime < ts) {
        try {
          const payload = JSON.parse(json) as Array<any>;
          if (
            payload.length === 2 &&
            payload[0] === "setLastRead" &&
            payload[1]?.date
          ) {
            lastReadTime = new Date(payload[1].date).getTime();
          }
        } catch (e) {
          // ignored ...
        }
      } // if
    } else if (type === "mention_operation") {
      console.log(op);
    } // if
  } // for
  for (const hn of rn) {
    // most recent first
    const { id, type, date, msg, url } = hn;
    const ts = new Date(date).getTime();

    //console.log(`${msg} is `, (ts > lastReadTime) ? 'newer' : 'older', 'than the last read time');

    //if ((lastReadTime !== null) && (ts < lastReadTime)) {
    //  read = 1;
    //}

    if (type === "mention") {
      const [discard, author, permlink] = url.split(/[@\/]/);
      const account = (() => {
        let x = /@([^ ]+) /.exec(msg);
        if (x && x[1]) {
          return x[1];
        } else {
          return null;
        }
      })();

      const post = false;
      const title = null,
        img_url = null;
      const id = `${msg} at ${date}`;
      const source = account;
      const gk = ToGroup(ts, date);
      const gkf = false;
      if (account !== null && source !== null) {
        const mn: ApiMentionNotification = {
          id,
          source,
          read: lastReadTime !== null && lastReadTime < ts ? 1 : 0,
          timestamp: date,
          ts,
          gk,
          gkf,
          type,
          author,
          account,
          permlink,
          post,
          title,
          img_url,
        };
        notifications.unshift(mn);
      } else {
        console.error("Could not parse account");
      }
    } else if (["follow", "unfollow", "ignore"].includes(type)) {
      /*{
        id: 7849626,
        type: 'follow',
        score: 30,
        date: '2021-11-08T20:33:42',
        msg: '@flamistan followed you',
        url: '@flamistan'
      }*/

      const m = /@(.+) followed you/.exec(msg);
      if (!m) continue;
      const source = m[1];
      const follower = source;
      const following = username;
      const gk = ToGroup(ts, date);
      if (m !== null && m.length > 1) {
        const fn: ApiFollowNotification = {
          id: msg,
          source: m[1],
          read: lastReadTime !== null && lastReadTime < ts ? 1 : 0,
          timestamp: date,
          ts,
          gk,
          gkf: false,
          type,
          follower,
          following,
          // I don't really understand what this is for...
          blog: type === "follow",
        };
        notifications.unshift(fn);
      } else {
        console.error("unexpected follow message");
      }
    } else if (type === "reblog") {
      /*
{
  id: 7849589,
  type: 'reply',
  score: 30,
  date: '2021-11-08T20:33:21',
  msg: '@flamistan replied to your post',
  url: '@flamistan/r29t3l'
}
{
  id: 7737952,
  type: 'reblog',
  score: 30,
  date: '2021-11-07T19:27:27',
  msg: '@riansilva reblogged your post',
  url: '@leprechaun/time-to-short-or-buy'
}
*/

      const account = (() => {
        const m = /@([^ ]+) /.exec(msg);
        if (m !== null && m.length > 1) return m[1];
        else return "";
      })();

      const [author, permlink] = (() => {
        const m = /@([^ ]+)\/([^ ]+)/.exec(url);
        if (m !== null && m.length == 3) {
          return m.slice(1);
        } else {
          return ["", ""];
        }
      })();
      const gk = ToGroup(ts, date);

      const rn: ApiReblogNotification = {
        id: msg,
        source: account,
        read: lastReadTime !== null && lastReadTime < ts ? 1 : 0,
        timestamp: date,
        ts,
        gk,
        gkf: false,

        type: "reblog",
        account,
        author,
        permlink,
        title: null,
        img_url: null,
      };
      notifications.unshift(rn);
    } else if (
      type !== "reply_comment" &&
      type !== "vote" &&
      type !== "reply"
    ) {
      console.log(hn);
    } // if
  } // for
  notifications = notifications.sort(
    (a: ApiNotification, b: ApiNotification) => {
      return b.ts - a.ts;
    }
  );
  if (notifications.length) {
    notifications[0].gkf = true;
  }
  for (let ni = 0; ni < notifications.length - 1; ++ni) {
    const nj = notifications[ni];
    const nk = notifications[ni + 1];
    nk.gkf =
      nj.gk != nk.gk &&
      moment.utc(nk.timestamp).fromNow() != moment.utc(nj.timestamp).fromNow();
  }
  return notifications;
} // fn

export default process;
