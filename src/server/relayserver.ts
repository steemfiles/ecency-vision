import * as http from "http";
import * as net from "net";
import axios from "axios";

const server = http
  .createServer(function (req, lres) {
    // 2 - creating server
    //console.log(req);
    const domain_name =
      process.env["SEARCH_API_ADDR"].match(/:\/\/([a-z\.]+)/)[1];
    const refererURL = new URL(req.headers.referer);
    const q = refererURL.searchParams.get("q");

    console.log("Got request to this HTTP server.", req.url, refererURL.search);
    let params : {[id:string]:string} = {};
    refererURL.searchParams.forEach((value, name) => {
      params[name] = value; 
    });    
    axios
      .post(
        process.env["SEARCH_API_ADDR"] + "search",
        params,
        { headers: { Authorization: process.env["SEARCH_API_SECRET"] } }
      )
      .then(function (response) {
        lres.writeHead(200, { "Content-Type": "application/json" });
        lres.write(JSON.stringify(response.data));
        lres.end();
      }, function (error) {
        console.log(error);
        lres.end();
      });
  })
  .on("error", (e) => {
    console.error(e);
  });

server.on("connect", (req, clientSocket, head) => {
  // Connect to an origin server
  const { port, hostname } = new URL(`http://${req.url}`);
  const serverSocket = net.connect(parseInt(port) || 80, hostname, () => {
    clientSocket.write(
      "HTTP/1.1 200 Connection Established\r\n" +
        "Proxy-agent: Node.js-Proxy\r\n" +
        "\r\n"
    );
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
    console.log(req);
  });
});

server.listen(2999);
console.log("Node.js web server at port 2999 is running..");
