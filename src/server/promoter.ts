import * as http from "http";
import * as net from "net";
import axios from "axios";

let x: any;
const domain_name =
  ((x = process.env["SEARCH_API_ADDR"]) &&
    (x = x.match(/:\/\/([a-z\.]+)/)) &&
    x[1]) ||
  "";

if (domain_name === "") {
  //abort here
}

const server = http
  .createServer(function (req, res) {
    // 2 - creating server
    console.log("Got request to this HTTP server.", req.url);
    let params: { [id: string]: string } = {};
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify({"result": "{}"}));
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
