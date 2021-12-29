export const TEST_NET = false;

// sometimes it's impossible to use html tags to style coin name, hence usage of _UPPERCASE modifier
export const APP_NAME = "WeedCash";

// sometimes APP_NAME is written in non-latin characters, but they are needed for technical purposes
// ie. "Голос" > "Golos"
export const APP_NAME_LATIN = "WeedCash";
export const APP_NAME_UPPERCASE = "WEEDCASH";
export const APP_ICON = "weedcash";

// FIXME figure out best way to do this on both client and server from env
// vars. client should read $STM_Config, server should read config package.
export const APP_URL = "https://www.weedcash.network";
export const APP_DOMAIN = "www.weedcash.network";

// the Hive user in charge of this particular website.
export const APP_ADMIN_HIVE = "good-karma";
export const APP_ADMIN_EMAIL = "info@ecency.com";

// max num of tags. if unset, default is 10. This is due to previous hardcoded number.
export const APP_MAX_TAG = 10;
export const SCOT_TAG = "weedcash";
export const TAG_LIST = ["cannabis", "psychedelic", "weed", "weedcash"];
export const LIQUID_TOKEN = "Weed";

// This symbol is used for identifying the currency to the *API* at hive-engine.com back
// in Nitrous and now here in Ecency.
// All such identifiers are all uppercase and latin.  It should not necessarily be used for displaying.
export const LIQUID_TOKEN_UPPERCASE = "FOODIE";

// used as backup
export const SCOT_DENOM = 100 * 1000 * 1000;
export const VOTE_WEIGHT_DROPDOWN_THRESHOLD = 1;
export const VESTING_TOKEN = "WEED POWER";
export const INTERLEAVE_PROMOTED = true;

// this should be set to the account username you have at Hive Signer.  Do not use the '@' sign in the username.
export const HIVE_SIGNER_APP = "ecency";

export const CURRENCY_SIGN = "$";
export const WIKI_URL = ""; // https://wiki.golos.io/
export const LANDING_PAGE_URL = "https://hive.io";
export const TERMS_OF_SERVICE_URL = "https://" + APP_DOMAIN + "/tos.html";
export const PRIVACY_POLICY_URL = "https://" + APP_DOMAIN + "/privacy.html";
export const WHITEPAPER_URL = "https://hive.io/hive-whitepaper.pdf";

//           Base layer non liquid value
export const VEST_TICKER = "VESTS";

//           Hive-Engine Layer token (for API use)
export const HIVE_ENGINE_TOKENS = [
  {
    apiName: "Weed",
    liquidHumanName: "Weed Cash",
    stakedHumanName: "Weed Power",
    precision: 3,
  },
];

type HELiquidAsset = "POB" | "WEED" | "TEST";
type HEStakedAsset = "BP" | "WP" | "TP";
export type LiquidAsset = "HIVE" | "HBD" | "TEST" | "HBD" | "TBD";
export type StakedAsset = "HP" | "BP" | "TP" | "WP";
export const tokenAliases: {
  [apiName: LiquidAsset | StakedAsset]: {
    liquidLong: string;
    stakedLong: string;
    stakedShort: StakedAsset | "";
    liquidShort: LiquidAsset;
  };
} = {
  POB: {
    liquidLong: "Proof of Brain",
    stakedLong: "Brain Power",
    stakedShort: "BP",
    liquidShort: "POB",
  },

  BP: {
    liquidLong: "Proof of Brain",
    stakedLong: "Brain Power",
    stakedShort: "BP",
    liquidShort: "POB",
  },

  HBD: {
    liquidLong: "Hive Dollars",
    stakedLong: "",
    stakedShort: "",
    liquidShort: "HBD",
  },

  TEST: {
    liquidLong: "Test",
    stakedLong: "Test Power",
    stakedShort: "TP",
    liquidShort: "TEST",
  },

  TP: {
    liquidLong: "Test",
    stakedLong: "Test Power",
    stakedShort: "TP",
    liquidShort: "TEST",
  },

  HIVE: {
    liquidLong: "Hive",
    stakedLong: "Hive Power",
    stakedShort: "HP",
    liquidShort: "HIVE",
  },

  HP: {
    liquidLong: "Hive",
    stakedLong: "Hive Power",
    stakedShort: "HP",
    liquidShort: "HIVE",
  },

  WEED: {
    liquidLong: "Weed Cash",
    stakedLong: "Weed Power",
    liquidShort: "WEED",
    stakedShort: "WP",
  },

  WP: {
    liquidLong: "Weed Cash",
    stakedLong: "Weed Power",
    liquidShort: "WEED",
    stakedShort: "WP",
  },
};

// application settings
export const DEFAULT_LANGUAGE = "en"; // used on application internationalization bootstrap
export const DEFAULT_CURRENCY = "USD";
export const ALLOWED_CURRENCIES = ["USD"];

// meta info
export const TWITTER_HANDLE = "@";
export const SHARE_IMAGE =
  "https://" + APP_DOMAIN + "/images/hive-blog-share.png";
export const TWITTER_SHARE_IMAGE =
  "https://" + APP_DOMAIN + "/images/hive-blog-twshare.png";
export const SITE_DESCRIPTION =
  "Weedcash is a social media platform where everyone gets paid for " +
  "creating and curating content. It leverages a robust digital points system, called WEED, that " +
  "supports real value for digital rewards through market price discovery and liquidity";

// various
export const SUPPORT_EMAIL = "support@" + APP_DOMAIN;

// Revive Ads
export const NO_ADS_STAKE_THRESHOLD = 2000;
export const REVIVE_ADS = {
  //header_banner: {
  //    zoneId: '1699',
  //    reviveId: '727bec5e09208690b050ccfc6a45d384',
  //},
  //sidebar_left: {
  //    zoneId: '1767',
  //    reviveId: '727bec5e09208690b050ccfc6a45d384',
  //},
  //sidebar_right: {
  //    zoneId: '1761',
  //    reviveId: '727bec5e09208690b050ccfc6a45d384',
  //},
  //post_footer_abovecomments: {
  //    zoneId: '1768',
  //    reviveId: '727bec5e09208690b050ccfc6a45d384',
  //},
  //post_footer_betweencomments: {
  //    zoneId: '1769',
  //    reviveId: '727bec5e09208690b050ccfc6a45d384',
  //},
  //feed: {
  //    zoneId: '1777',
  //    reviveId: '727bec5e09208690b050ccfc6a45d384',
  //},
  //feed_small: {
  //    zoneId: '',
  //    reviveId: '727bec5e09208690b050ccfc6a45d384',
  //},
};

// Other configurations
export const ALLOW_MASTER_PW = false;
// Footer to attach to posts. ${POST_URL} is a macro that can be used, will be expanded to the URL of the post.
export const POST_FOOTER = "";
// Footer to attach to commments. ${POST_URL} is a macro that can be used, will be expanded to the URL of the commment.
export const COMMENT_FOOTER = "";
export const SCOT_TAG_FIRST = false;
export const SCOT_DEFAULT_BENEFICIARY_ACCOUNT = "";
export const SCOT_DEFAULT_BENEFICIARY_PERCENT = 0; // between 0 amd 100
export const SHOW_AUTHOR_RECENT_POSTS = false;
export const POSTED_VIA_NITROUS_ICON = ""; // put corresponding svg in src/app/assets/icons/___.svg
export const COMMUNITY_CATEGORY = "";
export const SHOW_TOKEN_STATS = true;
export const TOKEN_STATS_EXCLUDE_ACCOUNTS = [];
export const PREFER_HIVE = true;
export const DISABLE_HIVE = false;
export const HIVE_ENGINE = true;
export const DISABLE_BLACKLIST = false;
export const CHAT_CONVERSATIONS = [
  { id: "01EPB6A2PPSW0BQVJ7WDDP568C", name: "BeeChat Trollbox" },
];
export const APPEND_TRENDING_TAGS_COUNT = 0;
export const TRENDING_TAGS_TO_IGNORE = [];

export const INVEST_TOKEN_UPPERCASE = HIVE_ENGINE
  ? "HIVE POWER"
  : "STEEM POWER";
export const INVEST_TOKEN_SHORT = HIVE_ENGINE ? "HP" : "SP";
export const DEBT_TOKEN = HIVE_ENGINE ? "HIVE DOLLAR" : "STEEM DOLLAR";
export const DEBT_TOKENS = HIVE_ENGINE ? "HIVE DOLLARS" : "STEEM DOLLARS";
