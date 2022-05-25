// This daemon is specific to proofofbrain.blog.

// Importing things from common hoses the compilation process.
// That's why there is a lot of duplicate declarations here.

import * as http from "http";
import * as net from "net";
import axios from "axios";
import * as mysql from "mysql";
import {
  Client,
  PrivateKey,
  RCAPI,
  utils,
  DEFAULT_CHAIN_ID,
  DEFAULT_ADDRESS_PREFIX,
} from "@hiveio/dhive";
const SSC = require("sscjs");
const hiveSsc = new SSC("https://api.hive-engine.com/rpc");

const precision = 8;

const author = process.env.PROMOTER;
const key: PrivateKey | null = (function () {
  try {
    if (!process.env.PROMOTERPOSTINGKEY) throw { message: "not set" };
    return PrivateKey.from(process.env.PROMOTERPOSTINGKEY);
  } catch (e) {
    console.warn("PROMOTERPOSTINGKEY variable not set");
    return null;
  }
})();

if (!author) {
  console.warn("PROMOTER variable not set");
}

export function validateEntry(e: any): void {
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

export function validateEntries(es: Array<any>) {
  for (const e of es) {
    validateEntry(e);
  }
}

// examples:
// select tx,permlink from promotions  where start > now() and now() < end;
// insert into promotions (tx, permlink, start, end) values ('000000000000000000000000000000000000', '@krishool/save-australia-or-public-health-and-well-being-bill-live-instagram-broadcast', now(), date_add(now(), interval 1000 second));
// select date_add(now(), interval 1000 second);

export interface RawTokenBalance {
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

// import { getTokenBalance } from '../common/api/hive-engine';

// // POB price / s = 1000 POB / year
// This healthy price even if you could rent for one second will be
// displayed properly and wont confuse the Hive Engine servers.
const MAINNET_SERVERS = ["https://rpc.ecency.com", "https://api.hive.blog"];
const price_rate = 0.00003171;
let promoted = [];
let proofOfBrainBalances = {};
const TEST_NET = false;
export const CHAIN_ID = TEST_NET
  ? "18dcf0a285365fc58b71f18b3d3fec954aa0c141c44e4e5cb4cf777b9eab274e"
  : DEFAULT_CHAIN_ID.toString("hex");
export const ADDRESS_PREFIX = TEST_NET ? "TST" : DEFAULT_ADDRESS_PREFIX;

export const hiveClient = new Client(MAINNET_SERVERS, {
  timeout: 4000,
  failoverThreshold: 10,
  consoleOnFailover: true,
  addressPrefix: ADDRESS_PREFIX,
  chainId: CHAIN_ID,
});

export const transferHiveEngineAssetJSON = (
  from: string,
  to: string,
  amount: string,
  memo: string,
  precision: number
): string => {
  let [quantity, token_name] = amount.replace(/,/g, "").split(/ /);
  const dotLocation = amount.indexOf(".");
  let new_length = quantity.length;
  if (dotLocation != -1 && quantity.length > dotLocation + precision) {
    // the expression is too long to be a well formed number.
    // Rounding errors sometimes value would be 2* epsilon too big
    // (https://www3.nd.edu/~zxu2/acms40390F15/Lec-1.2.pdf)
    quantity = quantity.slice(0, (new_length = dotLocation + 1 + precision));
  }
  while (new_length > dotLocation && quantity[new_length - 1] === "0") {
    --new_length;
  }
  if (dotLocation + 1 === new_length) {
    --new_length;
  }
  quantity = quantity.slice(0, new_length);
  const json = JSON.stringify({
    // is it always 'tokens'?
    contractName: "tokens",
    contractAction: "transfer",
    contractPayload: {
      symbol: token_name,
      to: to,
      quantity,
      memo: memo,
    },
  });
  return json;
};

interface Options {
  maximumFractionDigits?: number;
  fractionDigits?: number;
  prefix?: string;
  suffix?: string;
}

interface Transaction {
  refHiveBlockNumber: number;
  transactionId: string;
  sender: string;
  contract: string;
  action: string;
  payload: string;
  executedCodeHash: string;
  hash: string;
  databaseHash: string;
  logs: string;
}

interface Block {
  blockNumber: number;
  refHiveBlockNumber: number;
  previousHash: string;
  prevRefHiveBlockId: string;
  timestamp: string;
  transactions: Array<Transaction>;
}

interface errT {
  config: unknown;
  request: unknown;
  response: {
    statusText: string;
    status: number;
    headers: { [id: string]: string };
    config: { [id: string]: any };
    request: { [id: string]: any };
    data: string;
  };
  isAxiosError: boolean;
  toJSON: () => unknown;
}

let oldBlockNumber: number | null = null;
let savedStatusText: string = "";
let savedStatus: number = 0;
let errCount: number = 0;
// Watching Hive Engine transaction stream to insert promotions based on valid
// payments.  Watch out the stream sometimes include invalid transactions.
function handle_new_posts() {
  hiveSsc
    .stream((err: errT | null, result: Block | null) => {
      if (err) {
        const { response } = err;
        const { statusText, status } = response;
        if (errCount != 0 && statusText != savedStatusText) {
          console.error(
            `Error fetching current block ${errCount} x ${savedStatusText}`
          );
          errCount = 0;
          savedStatus = status;
          savedStatusText = statusText;
        } else if (statusText == savedStatusText) {
          ++errCount;
        }
        return;
      }
      if (errCount != 0) {
        console.error(
          `Error fetching current block ${errCount} x ${savedStatusText}`
        );
        errCount = 0;
        savedStatus = 0;
        savedStatusText = "";
      }

      if (!result) {
        return;
      }

      const { transactions, blockNumber } = result;
      if (oldBlockNumber !== null && oldBlockNumber + 1 < blockNumber) {
        console.log(
          `${
            blockNumber - oldBlockNumber + 1
          } blocks skipped from ${oldBlockNumber} to ${blockNumber}.`
        );
      }
      oldBlockNumber = blockNumber;

      if (transactions.length == 0) return;

      for (const transaction of transactions) {
        const { action, contract, sender, payload } = transaction;
        if (
          author &&
          key &&
          action == "comment" &&
          contract == "comments" &&
          payload
        ) {
          try {
            const postDetails = JSON.parse(payload);
            const { jsonMetadata } = postDetails;
            if (jsonMetadata === null) {
              continue;
            }

            const { tags } = jsonMetadata;

            const grand_parent_permlink = postDetails.parentPermlink;
            if (
              grand_parent_permlink !== undefined &&
              grand_parent_permlink.indexOf("hive-") !== 0
            )
              continue;
            if (!tags || !tags.length) continue;
            const parent_author = postDetails.author;
            const parent_permlink = postDetails.permlink;
            const json_metadata =
              '{"tags":["proofofbrain.blog"],"app":"proofofbrain.blog"}';
            const permlink =
              "re-" + parent_permlink + new Date().getTime() + "z";
            const parent_category = tags[0];
            const title = "";
            let body: string;
            if (
              tags.includes("introduction") ||
              tags.includes("introducemyself") ||
              tags.includes("introduceyourself")
            ) {
              console.log(
                `replying to ` +
                  `https://www.proofofbrain.blog/${parent_category}/@${parent_author}/${parent_permlink}`
              );
              // new user.  Give them a welcome...
              body =
                (tags.includes("proofofbrain") || tags.includes("pob")
                  ? `Welcome to the Proof of Brain community.`
                  : `Welcome to Hive.`) +
                ` Take a look at this guide:
                https://www.proofofbrain.blog/hive-150329/@leprechaun/the-absolute-beginner-s-guide-to-proof-of-brain.  It's a about how to use the Proof of Brain interfaces for brand new users.  Much of it  applies to Hive at large.`;
            } else if (tags.includes("binance")) {
              console.log(
                `replying to ` +
                  `https://www.proofofbrain.blog/${parent_category}/@${parent_author}/${parent_permlink}`
              );
              body = `Let's talk about Binance:
* Binance Improperly used users' funds to take over the Steem blockchain
* Binance does not always refund your money - violating our property
* Binance is almost constantly with Hive in maintenance mode.
* Binance will never return any Hive Dollars you send to it
* [This user](/@coininstant) [sent Hive to Binance](/binance/@coininstant/omg-binance-wants-me-to-make-a-video-if-my-transaction-to-get-my-money), and they refuse to refund it!

Read about it [here](/hive-150329/@leprechaun/a-call-for-binance-posts)

Ionomy, HitBTC, and Bittrex have always credited my account when there was a mistake in the memo after communicating with support.  
`;
            } else {
              continue;
            }
            hiveClient.broadcast
              .comment(
                {
                  author: author,
                  title: title,
                  body: body,
                  parent_author: parent_author,
                  parent_permlink: parent_permlink,
                  permlink: permlink,
                  json_metadata: json_metadata,
                },
                key
              )
              .then(
                function (result) {
                  console.log(
                    "Replied to",
                    `https://www.proofofbrain.blog/${parent_category}/` +
                      `@${parent_author}/${parent_permlink} in block: `,
                    result.block_num
                  );
                },
                function (error: object) {
                  console.log(`Cannot reply:`, error);
                  console.log(Object.keys(error));
                }
              );
          } catch (e) {
            console.log("Exception:", e.message);
          }
        } else if (action == "transfer" && contract == "tokens" && payload) {
          const details = JSON.parse(payload);
          const { transactionId } = transaction;

          const { symbol, to, quantity, memo } = details;
          if (!symbol || !to || !quantity || !memo || !memo.match) continue;

          if (to !== "proofofbrainblog") {
            //console.info(`payment not meant for proofofbrainblog`);
            continue;
          }

          if (symbol != "POB") {
            console.log(`payment not in POB!`);
            continue;
          }

          if (quantity + 0 === quantity) {
            console.log(
              `quantity (` +
                JSON.stringify(quantity) +
                `) is supposed to be a string not a number`
            );
            continue;
          }

          const m = /([0-9]|([1-9][0-9]+))(\.[0-9]+)/.exec(quantity);
          if (m === null) {
            console.log(`Non numeric quantity used: '${quantity}'`);
            continue;
          }

          const dotLocation = quantity.indexOf(".");
          if (
            dotLocation != -1 &&
            dotLocation + 1 + precision < quantity.length
          ) {
            console.log("Invalid amount of POB: " + quantity);
            continue;
          }

          const matched = memo.match(/promote @(.+)\/(.+) for (.+) seconds/);

          try {
            if (!matched) {
              // reject this tx
              throw Error(`Invalid memo: ${memo}`);
            }

            const memo_time = parseInt(matched[3]);
            const permlink = matched[2];
            const author = matched[1];
            const calculated_payment = memo_time * price_rate;
            const calculated_time = quantity / price_rate;
            if (calculated_payment > quantity) {
              // reject this transaction...
              throw Error(
                `Insufficient payment: Should have been ${calculated_payment} but was only ${quantity}`
              );
            }

            const insert_promotion = (post_data: string) => {
              const post_data_string = JSON.stringify(post_data);
              const stmt = con.query(
                "insert into promotions values (?, ?, ?, ?, now(), date_add(now(), interval ? second), ?)",
                [
                  blockNumber,
                  transactionId,
                  author,
                  permlink,
                  memo_time,
                  post_data_string,
                ],
                function (error, result) {
                  if (error) {
                    // should return funds here.
                    console.error(error);
                  } else {
                    console.log("Accepted");
                  }
                }
              );
            };

            hiveClient
              .call("condenser_api", "get_content", [author, permlink])
              .then(insert_promotion);
          } catch (e) {
            console.error(e.message);
            // should return funds here.
          }
        }
      } // for
    })
    .catch((x: any) => {
      const statusText = x?.response?.statusText;
      console.log(`Unable to stream blocks: ${statusText}...`);
      console.log("Will try again in 50 minutes.");
      setTimeout(handle_new_posts, 6000000);
    });
}

handle_new_posts();

// Public facing HTTP client to respond to webpage front end clients.
{
  var con = mysql.createConnection({
    host: "localhost",
    database: "enginecy",
    user: "webuser",
    password: process.env["MARIADB_PASSWORD"],
  });

  const server = http
    .createServer(function (req, res) {
      const { headers, url } = req;
      const { host } = headers;
      const refererURL = new URL("http://127.0.0.1" + url);
      const searchParams = refererURL.searchParams;

      // 2 - creating server
      console.log("Got request to this HTTP server.", req.url);
      let params: { [id: string]: string } = {};
      res.writeHead(200, { "Content-Type": "application/json" });
      if (url === "/getPrice" || url === "/getprice") {
        res.write(JSON.stringify({ price_rate }) + "\n");
        res.end();
      } else if (
        url === "/getPromoted" ||
        url === "/getpromoted" ||
        url === "/getPromotions"
      ) {
        con.query(
          "select data from promotions where start < now()" +
            "and now() < end group by permlink",

          function (err, result) {
            if (err) {
              res.write(JSON.stringify({ status: "error", err }, null, 2));
            } else {
              const entries = result
                .map((row: string) => {
                  try {
                    const e = JSON.parse(row["data"]);
                    return {
                      author_payout_value: `0.000 HBD`,
                      blacklists: [],
                      is_paidout: false,
                      payout: 0,
                      payout_at: "2019-11-11T07:20:51",
                      post_id: Math.floor(Math.random() * 1000000),
                      updated: e["created"],
                      ...e,
                    };
                  } catch (ex) {
                    return null;
                  }
                })
                .filter((x: any) => x != null);
              //res.write(JSON.stringify(entries));

              try {
                validateEntries(entries);
                res.write(JSON.stringify(entries) + "\n");
              } catch (e) {
                console.log(e);
                res.write("[]\n");
              }
            }
            res.end();
          }
        );
      } else if (url === "/promoted-post") {
        // @ts-ignore
        con.query(
          "select data from promotions where start < now()" +
            "and now() < end group by permlink limit 1",

          function (err, result) {
            if (err) {
              res.write(JSON.stringify({ status: "error", err }, null, 2));
            } else {
              if (result.length) {
                const one = result[0];
                res.write(one["data"].toString("utf8") + "\n");
              } else {
                res.write("undefined\n");
              }
            }
            res.end();
          }
        );
      } else if (url && url.match && url.match(/^\/getInvoice\b/)) {
        try {
          const time = parseInt(searchParams.get("time") ?? "0");
          const url = searchParams.get("url") ?? "0";
          const promoter = searchParams.get("promoter") || "0";
          const currency = "POB";
          // round up to the next satoshi
          const price_quantity = Math.trunc(-time * price_rate * 1e8) * -1e-8;

          if (!promoter || !url || !time) {
            throw Error("Invalid input");
          }

          console.log({ time, url, promoter });
          if (time < 1800) {
            throw Error("amount of time is too short");
          }

          if (price_quantity < 1e-6) {
            // must have this restriction in order to be able to send this the
            // JSON to the HiveEngine transaction server.  We can only use numbers
            // in standard notation.  Anything smaller than 1e-6 will not end up
            // in standard notation.
            throw Error("price is too small (rent for more time)");
          }

          // This routine will truncate numbers that contain an extra epsilon
          // value due to rounding errors.
          const tx_json = transferHiveEngineAssetJSON(
            promoter, // from
            "proofofbrainblog", // to
            price_quantity + " POB", // amount
            "promote " + url + " for " + time + " seconds", // memo
            8
          );
          res.write(
            JSON.stringify({ status: "success", result: tx_json }) + "\n"
          );
          res.end();
        } catch (e) {
          console.log(JSON.stringify(e.message));
          res.write(
            JSON.stringify({ status: "error", why: e.message || "unknown" }) +
              "\n"
          );
          res.end();
        }
      } else {
        res.write(
          JSON.stringify({ status: "error", why: "unrecognized url" }) + "\n"
        );
        res.end();
      }
    })
    .on("error", (e) => {
      console.error(JSON.stringify(e));
    });

  server.on("connect", (req, clientSocket, head) => {
    // Connect to an origin server
    const { port, hostname } = new URL(`http://${req.url}`);

    clientSocket.write(
      "HTTP/1.1 200 Connection Established\r\n" +
        "Proxy-agent: Node.js-Proxy\r\n" +
        "\r\n"
    );
    clientSocket.end();
  });

  server.listen(2998);
  console.log("Node.js web server at port 2998 is running..");
}
