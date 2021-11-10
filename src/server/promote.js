"use strict";
// Importing things from common hoses the compilation process.
// That's why there is a lot of duplicate declarations here.
exports.__esModule = true;
exports.transferHiveEngineAssetJSON = exports.hiveClient = exports.ADDRESS_PREFIX = exports.CHAIN_ID = void 0;
// examples:
// select tx,permlink from promotions  where start > now() and now() < end;
// insert into promotions (tx, permlink, start, end) values ('000000000000000000000000000000000000', '@krishool/save-australia-or-public-health-and-well-being-bill-live-instagram-broadcast', now(), date_add(now(), interval 1000 second));
// select date_add(now(), interval 1000 second);
var mysql = require("mysql");
var dhive_1 = require("@hiveio/dhive");
var SSC = require("sscjs");
var hiveSsc = new SSC("https://api.hive-engine.com/rpc");
// import { getTokenBalance } from '../common/api/hive-engine';
// // POB price / s = 1000 POB / year
// This healthy price even if you could rent for one second will be
// displayed properly and wont confuse the Hive Engine servers.
var MAINNET_SERVERS = ["https://rpc.ecency.com", "https://api.hive.blog"];
var price_rate = 0.00003171;
var promoted = [];
var proofOfBrainBalances = {};
var TEST_NET = false;
exports.CHAIN_ID = TEST_NET
    ? "18dcf0a285365fc58b71f18b3d3fec954aa0c141c44e4e5cb4cf777b9eab274e"
    : dhive_1.DEFAULT_CHAIN_ID.toString("hex");
exports.ADDRESS_PREFIX = TEST_NET ? "TST" : dhive_1.DEFAULT_ADDRESS_PREFIX;
exports.hiveClient = new dhive_1.Client(MAINNET_SERVERS, {
    timeout: 4000,
    failoverThreshold: 10,
    consoleOnFailover: true,
    addressPrefix: exports.ADDRESS_PREFIX,
    chainId: exports.CHAIN_ID
});
var transferHiveEngineAssetJSON = function (from, to, amount, memo) {
    var _a = amount.replace(/,/g, "").split(/ /), quantity = _a[0], token_name = _a[1];
    var json = JSON.stringify({
        // is it always 'tokens'?
        contractName: "tokens",
        contractAction: "transfer",
        contractPayload: {
            symbol: token_name,
            to: to,
            quantity: quantity,
            memo: memo
        }
    });
    return json;
};
exports.transferHiveEngineAssetJSON = transferHiveEngineAssetJSON;
var con = mysql.createConnection({
    host: "localhost",
    database: "enginecy",
    user: "webuser",
    password: process.env["MARIADB_PASSWORD"]
});
console.log("Starting");
var permlink = 'hallazgo-de-un-planeta-que-orbita-a-tres-estrellas';
var author = 'andresmujica';
var memo_time = 1000;
hiveSsc
    .stream(function (err, result) {
    if (err) {
        //console.error(err);
        return;
    }
    if (!result) {
        return;
    }
    var transactions = result.transactions, blockNumber = result.blockNumber;
    if (transactions.length == 0)
        return;
    for (var _i = 0, transactions_1 = transactions; _i < transactions_1.length; _i++) {
        var transaction = transactions_1[_i];
        var transactionId = transaction.transactionId;
        exports.hiveClient
            .call("condenser_api", "get_content", [author, permlink])
            .then(function (post_data) {
            console.log("Got post data");
            var stmt = con.createQuery("insert into test (val) values (?)", [100], function (err, result) {
                if (err) {
                    console.error("Failed", err);
                    // should return funds here.
                }
                else {
                    console.log("Accepted");
                }
                process.exit();
            });
        })["catch"](function (e) {
            //console.error(JSON.stringify(e));
        });
        break;
    } // for
})["catch"](console.error);
