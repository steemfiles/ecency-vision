"use strict";
exports.__esModule = true;
var http = require("http");
var net = require("net");
var axios_1 = require("axios");
var x;
var domain_name = ((x = process.env["SEARCH_API_ADDR"]) &&
    (x = x.match(/:\/\/([a-z\.]+)/)) &&
    x[1]) ||
    "";
if (domain_name === "") {
    //abort here
}
var server = http
    .createServer(function (req, lres) {
    // 2 - creating server
    var refererURL = new URL((req && req.headers && req.headers.referer) || "");
    var q = refererURL.searchParams.get("q");
    var addr = (function () {
        var search_api_addr = process.env["SEARCH_API_ADDR"] || "";
        if (search_api_addr.length > 0 && search_api_addr.substr(-1) == "/") {
            return search_api_addr.slice(0, search_api_addr.length - 1);
        }
        else {
            return search_api_addr;
        }
    })() + req.url;
    console.log("Got request to this HTTP server.", req.url, refererURL.search);
    var params = {};
    refererURL.searchParams.forEach(function (value, name) {
        params[name] = value;
    });
    if (req.url === "/search") {
        axios_1["default"]
            .post(addr, params, {
            headers: { Authorization: process.env["SEARCH_API_SECRET"] }
        })
            .then(function (response) {
            lres.writeHead(200, { "Content-Type": "application/json" });
            lres.write(JSON.stringify(response.data));
            lres.end();
        }, function (error) {
            console.log(error);
            lres.end();
        });
    }
    else {
        axios_1["default"]
            .post(addr, params, {
            headers: { Authorization: process.env["SEARCH_API_SECRET"] }
        })
            .then(function (response) {
            lres.writeHead(200, { "Content-Type": "application/json" });
            lres.write(JSON.stringify(response.data));
            lres.end();
        }, function (error) {
            console.log(error);
            lres.end();
        });
    }
})
    .on("error", function (e) {
    console.error(e);
});
server.on("connect", function (req, clientSocket, head) {
    // Connect to an origin server
    var _a = new URL("http://" + req.url), port = _a.port, hostname = _a.hostname;
    var serverSocket = net.connect(parseInt(port) || 80, hostname, function () {
        clientSocket.write("HTTP/1.1 200 Connection Established\r\n" +
            "Proxy-agent: Node.js-Proxy\r\n" +
            "\r\n");
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
        console.log(req);
    });
});
server.listen(2999);
console.log("Node.js web server at port 2999 is running..");
