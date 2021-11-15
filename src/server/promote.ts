// Importing things from common hoses the compilation process.
// That's why there is a lot of duplicate declarations here.

import * as http from "http";
import * as net from "net";
import axios from "axios";

// examples:
// select tx,permlink from promotions  where start > now() and now() < end;
// insert into promotions (tx, permlink, start, end) values ('000000000000000000000000000000000000', '@krishool/save-australia-or-public-health-and-well-being-bill-live-instagram-broadcast', now(), date_add(now(), interval 1000 second));
// select date_add(now(), interval 1000 second);

import * as mysql from "mysql";
import {
  Client,
  RCAPI,
  utils,
  DEFAULT_CHAIN_ID,
  DEFAULT_ADDRESS_PREFIX,
} from "@hiveio/dhive";
const SSC = require("sscjs");
const hiveSsc = new SSC("https://api.hive-engine.com/rpc");

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
  memo: string
): string => {
  const [quantity, token_name] = amount.replace(/,/g, "").split(/ /);
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

const makeUTF = (s: any) => {
  if (typeof s === "string") {
    return Buffer.from(s, "utf8").toString("utf8");
  } else if (typeof s === "object") {
    for (const key in s) {
      s[key] = makeUTF(s[key]);
    }
  }
  return s;
};

var con = mysql.createConnection({
  host: "localhost",
  database: "enginecy",
  user: "webuser",
  password: process.env["MARIADB_PASSWORD"],
});
console.log("Starting");

const when_done = () => {
  process.exit(0);
};

const permlink = process.argv[3];
const author = process.argv[2];
const memo_time = 1000;
hiveSsc
  .stream((err: unknown | null, result: Block | null) => {
    if (err) {
      console.error("Error:", err);
      return;
    }
    if (!result) {
      return;
    }

    const { transactions, blockNumber } = result;

    if (transactions.length == 0) return;
    for (const transaction of transactions) {
      const { transactionId } = transaction;

      const insert_promotion = (post_data: object) => {
        // When the axios parses everything, strings are parsed as if they were
        // ascii: raw bytes.  So non-ascii code points show up as several bytes.
        // These several bytes are considered as if they are separate characters!

        // They have to be re-encoded as UTF-8 so that the MYSQL API doesn't try
        // to decode the already utf8 decoded raw bytes, giving an error.
        for (const key in post_data) {
          if (typeof post_data[key] === "string") {
            const raw = Buffer.from(post_data[key], "ascii");
            post_data[key] = raw.toString("utf8");
          }
        }
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
              console.log("Here", error);
            } else {
              console.log("Accepted");
            }
            when_done();
          }
        );
      };

      hiveClient
        .call("condenser_api", "get_content", [author, permlink])
        .then(insert_promotion);
      //.catch((e) => {
      //  console.error("Error:", JSON.stringify(e));
      //});
      break;
    } // for
  })
  .catch(console.error);
