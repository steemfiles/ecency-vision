import * as http from "http";
import * as net from "net";
import axios from "axios";

if (!process.env["SEARCH_API_SECRET"] || !process.env["SEARCH_API_ADDR"]) {
  console.log(
    "Please ensure SEARCH_API_SECRET and SEARCH_API_ADDR " +
      "environment variables are set"
  );
  process.exit(1);
}

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
  .createServer(function (req, lres) {
    // 2 - creating server
    const refererURL = new URL(
      (req && req.headers && req.headers.referer) || ""
    );
    const q = refererURL.searchParams.get("q");

    const addr: string =
      ((): string => {
        const search_api_addr = process.env["SEARCH_API_ADDR"] || "";
        if (search_api_addr.length > 0 && search_api_addr.substr(-1) == "/") {
          return search_api_addr.slice(0, search_api_addr.length - 1);
        } else {
          return search_api_addr;
        }
      })() + req.url;
    console.log("Got request to this HTTP server.", req.url, refererURL.search);
    let params: { [id: string]: string } = {};
    let params_string = "";
    req.on("data", (chunk) => {
      params_string += chunk;
    });
    req.on("end", () => {
      params = JSON.parse(params_string);
      if (req.url === "/search") {
        axios
          .post(addr, params, {
            headers: {
              Authorization: process.env["SEARCH_API_SECRET"] as string,
            },
          })
          .then(
            function (response) {
              lres.writeHead(200, { "Content-Type": "application/json" });
              lres.write(JSON.stringify(response.data));
              lres.end();
            },
            function (error) {
              console.log(error);
              lres.end();
            }
          );
      } else {
        axios
          .post(addr, params, {
            headers: {
              Authorization: process.env["SEARCH_API_SECRET"] as string,
            },
          })
          .then(
            function (response) {
              lres.writeHead(200, { "Content-Type": "application/json" });
              lres.write(JSON.stringify(response.data));
              lres.end();
            },
            function (error) {
              console.log(error);
              lres.end();
            }
          );
      }
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
