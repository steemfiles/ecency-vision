import * as http from "http";
import * as net from "net";
import axios from "axios";

// // POB price / s = 1000 POB / year
// This healthy price even if you could rent for one second will be
// displayed properly and wont confuse the Hive Engine servers.
const price_rate = 0.00003171;
const promoted = []

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

const server = http
  .createServer(function (req, res) {
    const {headers, url} = req;
    const refererURL = new URL(headers.host + url);
    const searchParams = refererURL.searchParams;
      
    // 2 - creating server
    console.log("Got request to this HTTP server.", req.url);
    let params: { [id: string]: string } = {};
    res.writeHead(200, { "Content-Type": "application/json" });
    if (req.url === '/getPromoted') {
      res.write(JSON.stringify({"status": "success", "promoted": promoted}) + '\n');  
    } else if (url.match(/^\/getInvoice\b/)) {
      try {
        const time = parseInt(searchParams.get('time'));
        const url  = searchParams.get('url');
        const promoter = searchParams.get('promoter');
        const currency = 'POB';
        const price_quantity = Math.trunc(-time * price_rate * 1e8) * -1e-8;
        
        
        
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
          'proofofbrainblog',// to
          price_quantity + " POB", // amount
          url // memo
        );
        res.write(JSON.stringify({"status": "success", "result": tx_json}) + '\n');
      } catch (e) {
        console.log(JSON.stringify(e.message));
        res.write(JSON.stringify({"status": "error", "why": e.message || "unknown"}) + '\n');
      }
    } else {
      res.write(JSON.stringify({"status": "error", "why": "unrecognized url"}) + '\n');
    }
    res.end();
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
      "\r\n");
  clientSocket.end();
});

server.listen(2998);
console.log("Node.js web server at port 2998 is running..");
