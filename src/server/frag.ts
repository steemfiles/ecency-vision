import * as mysql from "mysql";
const price_rate = 0.00003171;
var con = mysql.createConnection({
  host: "localhost",
  database: "enginecy",
  user: "webuser",
  password: process.env["MARIADB_PASSWORD"],
});
for (let x = 0; x < 1; x = x + 1) {
  const blockNumber = -new Date().getTime();
  const transactionId = "000000000000000000000011134";
  const { symbol, to, quantity, memo } = {
    symbol: "POB",
    to: "proofofbrainblog",
    quantity: 5,
    memo: "promote /hive-109255/@pressfortruth/neqgygsg for 10000 seconds",
  };
  if (!symbol || !to || !quantity || !memo) continue;
  const matched = memo.match(/promote (.+) for (.+) seconds/);
  try {
    if (!matched) {
      // reject this tx
      throw Error("Invalid memo");
    }
    const memo_time = parseInt(matched[2]);
    const memo_permlink = matched[1];
    const calculated_payment = memo_time * price_rate;
    const calculated_time = quantity / price_rate;
    if (calculated_payment > quantity) {
      // reject this transaction...
      throw Error("Insufficient payment");
    }
    con.query(
      `insert into promotions (blockNumber, tx, permlink, start, end)` +
        `values (${blockNumber}, '${transactionId}', '${memo_permlink}', 
      now(), date_add(now(), interval ${memo_time} second));`,
      function (err, result) {
        if (err) {
          console.error("Failed", err);
          // should return funds here.
        } else {
          console.log("Accepted");
        }
      }
    );
  } catch (e) {
    console.error(e.message);
    // should return funds here.
  }
}
