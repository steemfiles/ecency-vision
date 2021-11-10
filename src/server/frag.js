"use strict";
exports.__esModule = true;
var mysql = require("mysql");
var price_rate = 0.00003171;
var con = mysql.createConnection({
    host: "localhost",
    database: "enginecy",
    user: "webuser",
    password: process.env["MARIADB_PASSWORD"]
});
for (var x = 0; x < 1; x = x + 1) {
    var blockNumber = -(new Date()).getTime();
    var transactionId = '000000000000000000000011134';
    var _a = {
        symbol: 'POB',
        to: 'proofofbrainblog',
        quantity: 5,
        memo: 'promote /hive-109255/@pressfortruth/neqgygsg for 10000 seconds'
    }, symbol = _a.symbol, to = _a.to, quantity = _a.quantity, memo = _a.memo;
    if (!symbol || !to || !quantity || !memo)
        continue;
    var matched = memo.match(/promote (.+) for (.+) seconds/);
    if (!matched) {
        // reject this tx
        console.error("Invalid memo");
        continue;
    }
    var memo_time = parseInt(matched[2]);
    var memo_permlink = matched[1];
    var calculated_payment = memo_time * price_rate;
    var calculated_time = quantity / price_rate;
    if (calculated_payment > quantity) {
        // reject this transaction...
        console.error("Insufficient payment");
        continue;
    }
    con.query("insert into promotions (blockNumber, tx, permlink, start, end)" +
        ("values (" + blockNumber + ", '" + transactionId + "', '" + memo_permlink + "', \n      now(), date_add(now(), interval " + memo_time + " second));"), function (err, result) {
        if (err) {
            console.log("Failed", err);
        }
        else {
            console.log("Accepted");
        }
    });
}
