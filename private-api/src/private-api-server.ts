import * as http from "http";
import * as net from "net";
import axios from "axios";
import { Client } from "@hiveio/dhive";
import { process, ApiNotification } from "./notifications";
import { Url, URL, URLSearchParams } from "url";

// If set true, it will avoid pulling new data too often
const cache = true;

export const hiveClient = new Client(["https://api.hive.blog"], {
  timeout: 4000,
  failoverThreshold: 10,
  consoleOnFailover: true,
});

const minimumPeriodBetweenFetches = 4000;
const historyLimit = 999;
const notificationLimit = 99;

interface User {
  history: Array<unknown>;
  hiveNotifications: Array<unknown>;
  apiNotifications: Array<ApiNotification>;
}
const users: { [id: string]: null | User } = {};
const history_numbers: { [id: string]: number } = {};
const notification_numbers: { [id: string]: number } = {};
function fetch(activeUser: string): Promise<Array<ApiNotification> | null> {
  if (!activeUser) {
    return new Promise<Array<ApiNotification>>((resolve) => {
      return resolve(null);
    });
  }
  try {
    return Promise.all([
      hiveClient.call("account_history_api", "get_account_history", {
        account: activeUser,
        limit: historyLimit,
        start: -1,
      }),
      hiveClient.call("bridge", "account_notifications", {
        account: activeUser,
        limit: notificationLimit,
      }),
    ])
      .then((results) => {
        const [rh, rn] = results;
        const { history } = rh;
        const last_history = history.length
          ? history[history.length - 1][0]
          : -1;
        history_numbers[activeUser] = last_history;
        //console.log(history_numbers);
        const oldNotifications = users[activeUser];
        const newNotifications: ApiNotification[] =
          process(rh, rn, activeUser) ?? [];
        users[activeUser] = {
          history,
          hiveNotifications: rn,
          apiNotifications: oldNotifications
            ? [...oldNotifications.apiNotifications, ...newNotifications]
            : newNotifications,
        };
        return newNotifications;
      })
      .catch((e) => {
        console.log("Error:", JSON.stringify(e, null, 2));
        return users[activeUser].apiNotifications;
      });
  } catch (e) {
    console.log("Error:", e);
  }
  return new Promise<Array<ApiNotification>>((resolve) => {
    return resolve(users[activeUser].apiNotifications ?? []);
  });
}

const server = http
  .createServer(function (req, lres) {
    // 2 - creating server
    const { headers, url } = req;
    const size = ((r: any) => {
      if (!r) return -1;
      r = r.headers;
      if (!r) return -1;
      r = r["content-length"];
      if (r === undefined) return -1;
      return parseInt(r, 10);
    })(req);
    const buffer = Buffer.allocUnsafe(size);
    var pos = 0;
    // @ts-ignore
    function handleError(code: number, res: ServerResponse) {
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
        console.log({ data });
        const { code, username } = data;
        // should validate this to prevent malicious scripts from mischief.
        lres.setHeader("Content-Type", "application/json;charset=utf-8");
        const _c = (k: string): any => {
          const __c = headers.cookie;
          if (__c === undefined) return null;
          const __settings: Array<string> = __c.split(/;/);
          const __pairs: Array<Array<string>> = __settings.map((setting) =>
            setting.split(/=/)
          );

          const __pair: Array<string> | undefined = __pairs.find(
            (p) => p[0] === k
          );
          if (__pair === null || __pair === undefined) {
            return null;
          } else {
            return __pair[1];
          }
        };
        const activeUser = username || _c("active_user") || null;
        if (activeUser === null) {
          console.log("Error: activeUser not set in cookie");
        } else {
          console.log({ activeUser });
        }
        let promise: Promise<Array<ApiNotification> | null>;
        const oldNotifications = users[activeUser];
        let lastNotification: ApiNotification | null = null;

        let x: any;
        if ((x = oldNotifications) && (x = x.apiNotifications) && x.length) {
          lastNotification = x[0];
        }

        if (false) {
          promise = new Promise<Array<ApiNotification>>((resolve) => {
            return resolve(users[activeUser].apiNotifications ?? []);
          });
        } else {
          promise = fetch(activeUser);
        }
        const { since, filter } = data;
        promise.then((notificaitons_p: Array<ApiNotification> | null) => {
          if (notificaitons_p === null) {
            handleError(404, lres);
            return;
          }
          let notifications: Array<ApiNotification> =
            notificaitons_p as Array<ApiNotification>;
          if (lastNotification) {
            console.log("lastNot...: " + lastNotification.id);
            for (let i = 0; i < notifications.length; ++i) {
              console.log(notifications[i].id);
              if (notifications[i].id === lastNotification.id) {
                console.log("lastNotification found in new notifications");
                notifications = notifications.slice(0, i);
                break;
              }
            }
            users[activeUser].apiNotifications = notifications = [
              ...notifications,
              ...oldNotifications.apiNotifications,
            ];
          }
          if (url === "/notifications/unread") {
            const count = notifications.filter(
              (n: ApiNotification) =>
                (!since || n.timestamp > since) && n.read === 0
            ).length;
            console.log({ count });
            lres.write(JSON.stringify({ count }) + "\n");
            lres.end();
          } else if (url === "/notifications") {
            console.log({ since, filter });
            notifications = notifications.filter(
              (n) =>
                (!since || n.timestamp > since) && (!filter || n.gk === filter)
            );
            lres.write(JSON.stringify(notifications) + "\n");
            lres.end();
          } else if (url === "/notifications/mark") {
            const { id } = data;
            let userData: undefined | User = users[activeUser];
            if (userData) {
              let ns = userData.apiNotifications;
              for (const n of ns) {
                if (!id || id === n.id) {
                  n.read = 1;
                  console.log(`Marked ${n.id} as read`);
                }
              }
            } // if
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
