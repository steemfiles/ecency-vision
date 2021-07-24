/* !!! DO NOT IMPORT config.js TO FRONTEND CODE !!! */

export default {
  usePrivate: process.env.USE_PRIVATE || "0", // "1" | "0"
  privateApiAddr: process.env.PRIVATE_API_ADDR || "https://domain.com/api",
  privateApiAuth: process.env.PRIVATE_API_AUTH || "privateapiauth",
  hsClientSecret:
    process.env.HIVESIGNER_CLIENT_SECRET || "hivesignerclientsecret",
  hsClientId: process.env.HIVESIGNER_CLIENT_ID || "steemfiles",
  searchApiAddr: process.env.SEARCH_API_ADDR || "https://api.search.com",
  searchApiToken: process.env.SEARCH_API_SECRET || "searchApiSecret",
};
