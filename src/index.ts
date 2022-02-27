import express from "express";
import site from "./common/constants/site.json";
import defaults from "./common/constants/defaults.json";
let missing_keys = [];
for (const key in defaults) {
  if (site[key] === undefined) {
    missing_keys.push(key);
  }
}

if (missing_keys.length > 0) {
  console.log("Missing keys in common/constants/site.json: ");
  for (const key of missing_keys) {
    console.log(key);
  }
  process.exit(0);
}

const acceptable_filters = ["hot", "trending", "created"];
if (!acceptable_filters.includes(site.filter)) {
  console.log(
    "filter key should be one of " + JSON.stringify(acceptable_filters)
  );
}

let app = require("./server").default;

if (module.hot) {
  module.hot.accept("./server", () => {
    console.log("🔁  HMR Reloading `./server`...");
    try {
      app = require("./server").default;
    } catch (error) {
      console.error(error);
    }
  });
  console.info("✅  Server-side HMR Enabled!");
}

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const server = express()
  .use((req, res) => app.handle(req, res))
  .listen(port, () => {
    console.log(`> Started on port ${port}`);
  });

["SIGINT", "SIGTERM"].forEach((signal: any) => {
  process.on(signal, () => {
    console.info(`Shutting down because of ${signal}`);
    server.close(() => {
      console.error("Server closed gracefully");
      process.exit(0);
    });
  });
});

export default server;
