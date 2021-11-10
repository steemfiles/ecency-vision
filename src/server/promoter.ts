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

{
  hiveSsc
    .stream((err: unknown | null, result: Block | null) => {
      if (err) {
        console.error(err);
        return;
      }
      if (!result) {
        return;
      }

      const { transactions, blockNumber } = result;

      if (transactions.length == 0) return;
      for (const transaction of transactions) {
        const { action, contract, sender, payload } = transaction;
        if (action != "transfer" || contract != "tokens" || !payload) {
          continue;
        }
        const details = JSON.parse(payload);
        const { transactionId } = transaction;

        const { symbol, to, quantity, memo } = details;
        if (to !== "proofofbrainblog") {
          //console.info(`payment not meant for proofofbrainblog`);
          continue;
        }
        if (symbol != "POB") {
          console.log(`payment not POB!`);
          continue;
        }
        if (!symbol || !to || !quantity || !memo || !memo.match) continue;
        const matched = memo.match(/promote (.+)\/(.+) for (.+) seconds/);

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
          hiveClient
            .call("condenser_api", "get_content", [author, permlink])
            .then((post_data) => {
              const stmt = con.query(
                "insert into promotions (blockNumber, tx, author, permlink, start, end, data) values (?, ?, ?, ?, now(), now()+?, ?)",
                [
                  blockNumber,
                  transactionId,
                  author,
                  permlink,
                  memo_time,
                  JSON.stringify(post_data),
                ],
                function (err, result) {
                  if (err) {
                    console.error("Failed", err);
                    // should return funds here.
                  } else {
                    console.log("Accepted");
                  }
                  process.exit();
                }
              );
            })
            .catch((e) => {
              console.error(JSON.stringify(e));
            });
        } catch (e) {
          console.error(e.message);
          // should return funds here.
        }
      } // for
    })
    .catch(console.error);
}

if (true) {
  var con = mysql.createConnection({
    host: "localhost",
    database: "enginecy",
    user: "webuser",
    password: process.env["MARIADB_PASSWORD"],
  });

  const server = http
    .createServer(function (req, res) {
      const { headers, url } = req;
      console.log(req);
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
      } else if (url === "/getPromoted") {
        con.query(
          "select data from promotions where start < now()" +
            "and now() < end group by permlink",

          function (err, result) {
            if (err) {
              res.write(JSON.stringify({ status: "error", err }, null, 2));
            } else {
              res.write(
                JSON.stringify(result.map((row) => JSON.parse(row["data"]))) +
                  "\n"
              );
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

          const tx_json = transferHiveEngineAssetJSON(
            promoter, // from
            "proofofbrainblog", // to
            price_quantity + " POB", // amount
            "promote " + url + " for " + time + " seconds" // memo
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
