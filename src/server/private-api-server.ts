import * as http from "http";
import * as net from "net";
import axios from "axios";
import { Client } from "@hiveio/dhive";
import { process, ApiNotification } from "../../private-api/src/notifications";
import { Url, URL, URLSearchParams } from "url";

export const hiveClient = new Client(["https://api.hive.blog"], {
  timeout: 4000,
  failoverThreshold: 10,
  consoleOnFailover: true,
});

const historyLimit = 99;
const notificationLimit = 99;

const users: { [id: string]: null | string } = {};

const server = http
  .createServer(function (req, lres) {
    // 2 - creating server
    const { headers, url } = req;
    const size = parseInt(req.headers["content-length"], 10);
    const buffer = Buffer.allocUnsafe(size);
    var pos = 0;
    function handleError(res, code) {
      res.statusCode = code;
      res.end(`{"error": "${http.STATUS_CODES[code]}"}`);
    }

    req
      .on("data", (chunk) => {
        const offset = pos + chunk.length;
        if (offset > size) {
          handleError(413, lres);
          return;
        }
        chunk.copy(buffer, pos);
        pos = offset;
      })
      .on("end", () => {
        if (pos !== size) {
          handleError(400, lres);
          return;
        }
        const data = JSON.parse(buffer.toString());
        console.log("User Posted: ", data);
        const { code } = data;
        // should validate this to prevent malicious scripts from mischief.
        lres.setHeader("Content-Type", "application/json;charset=utf-8");
        const _c = (k: string): any => {
          const __c = headers.cookie;
          const __settings = __c.split(/;/);
          const __pairs = __settings.map((setting) => setting.split(/=/));

          const __pair = __pairs.find((p) => p[0] === k);
          if (__pair === null) return null;
          return __pair[1];
        };
        const activeUser = _c("active_user") || null;
        Promise.all([
          hiveClient.call("account_history_api", "get_account_history", {
            account: activeUser,
            limit: historyLimit,
            start: -1,
          }),
          hiveClient.call("bridge", "account_notifications", {
            account: activeUser,
            limit: notificationLimit,
          }),
        ]).then((results) => {
          const [rh, rn] = results;
          let notificaitons = process(rh, rn, activeUser);

          if (url === "/notifications/unread") {
            const count = notificaitons.filter(
              (n: ApiNotification) => n.read === 0
            ).length;
            lres.write(JSON.stringify({ count }) + "\n");
            lres.end();
          } else if (url === "/notifications") {
            const { since, filter } = data;
            console.log({ since, filter });
            if (since) {
              notificaitons = notificaitons.filter((n) => n.timestamp > since);
            }
            lres.write(JSON.stringify(notificaitons) + "\n");
            lres.end();
          } else if (url === "/notifications/mark") {
            const { id } = data;
            notificaitons = notificaitons.map((n) => {
              if (id) {
                if (n.id === id) {
                  n.read = 1;
                }
              } else {
                n.read = 1;
              }
              return n;
            });
            lres.end();
          } else {
            handleError(404, lres);
          }
        });
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
  });
});

server.listen(2997);
console.log("Node.js web server at port 2997 is running..");
