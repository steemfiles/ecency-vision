import {
  Client,
} from "@hiveio/dhive";

/*
 curl -s --data '{"jsonrpc":"2.0", "method":"bridge.account_notifications",
"params":{"account":"leprechaun","limit":100}, "id":2}' https://api.hive.blog
*/

export const hiveClient = new Client(["https://api.hive.blog"], {
  timeout: 4000,
  failoverThreshold: 10,
  consoleOnFailover: true,
});


const historyLimit = 19;
const notificationLimit = 19;

Promise.all([hiveClient.call('account_history_api', 'get_account_history', { account: 'leprechaun', limit: historyLimit, start: -1} ), 
hiveClient.call("bridge", "account_notifications", { account: "leprechaun", limit: notificationLimit })])
.then( results => {
    const [rh, rn] = results;
    console.log("export const rh = ", JSON.stringify(rh, null, 2));
    console.log("export const rn = ", JSON.stringify(rn, null, 2));
    
    
});
