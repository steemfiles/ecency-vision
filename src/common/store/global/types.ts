import { LocationChangeAction } from "../common";
import {
  TokenPropertiesMap,
  HEIncludeAction,
  HEFetchAction,
} from "../hive-engine-tokens/types";

export enum ListStyle {
  row = "row",
  grid = "grid",
}

export enum Theme {
  day = "day",
  night = "night",
}

export enum EntryFilter {
  trending = "trending",
  hot = "hot",
  created = "created",
  payout = "payout",
  muted = "muted",
}

export enum ProfileFilter {
  blog = "blog",
  posts = "posts",
  comments = "comments",
  replies = "replies",
}

export interface LanguageSpec {
  languageCode: string;
  priority: number;
}

// TODO: Find a proper way to merge EntryFilter and ProfileFilter
export enum AllFilter {
  trending = "trending",
  hot = "hot",
  created = "created",
  payout = "payout",
  muted = "muted", // To see muted accounts
  blog = "blog", // This might be deleted
  posts = "posts",
  comments = "comments",
  replies = "replies",
  feed = "feed",
}

export interface Global {
  // The member negotiatedLanguage expresses the product of the language negotiation.
  // It contains only language code strings found in LangOptions found in '../../i18n'.
  // The best is first, the one with the lowest score is last.  The negotation happens
  // using the HTTP headers sent by the user agent.

  // The negotation process is written in a way that on purpose doesn't take into
  // account that a user may rather read things in one country's Spanish or
  // anothers. If you have Spanish Spanish as the last resort but prefer Argentine
  // Spanish over English in your headers, the negotiation process will leave you
  // with Spanish Spanish. It is done this way because it seems more likely that
  // you may have some non-Spain set, and it makes more sense to me that this gives
  // you Spanish Spanish rather than going to the English default.

  negotiatedLanguages: Array<string>;

  // The member acceptLanguage is the accepted languages from the client. The array
  // is sorted as best language first and always contains the generic language only
  // codes next to the first instance of a locale that contains that language. The
  // generic language code is the normally two letter abbreviation for the
  // language.  This is derived from the accept-language header sent by the user
  // agent.
  acceptLanguage: Array<LanguageSpec>;

  // Hash to lookup whether a language is acceptable for the user. This is derived
  // from the accept-language header sent by the user agent.
  acceptableLanguage: { [langaugeCode: string]: boolean };
  filter: EntryFilter | ProfileFilter | AllFilter;
  tag: string;
  theme: Theme;
  listStyle: ListStyle;
  intro: boolean;
  currency: string;
  currencyRate: number;
  currencyPrecision: number;
  currencySymbol: string;
  lang: string;
  searchIndexCount: number;
  canUseWebp: boolean;
  hasKeyChain: boolean;
  isElectron: boolean;
  newVersion: string | null;
  notifications: boolean;
  nsfw: boolean;
  isMobile: boolean;
  usePrivate: boolean;
  hiveEngineTokensProperties?: TokenPropertiesMap;
}

export enum ActionTypes {
  THEME_CHANGE = "@global/THEME_CHANGE",
  INTRO_HIDE = "@global/INTRO_HIDE",
  LIST_STYLE_CHANGE = "@global/LIST_STYLE_CHANGE",
  HAS_KEYCHAIN = "@global/HAS_KEYCHAIN",
  NOTIFICATIONS_MUTE = "@global/NOTIFICATIONS_MUTE",
  NOTIFICATIONS_UNMUTE = "@global/NOTIFICATIONS_UNMUTE",
  CURRENCY_SET = "@global/CURRENCY_SET",
  LANG_SET = "@global/LANG_SET",
  NEW_VERSION_CHANGE = "@global/NEW_VERSION_CHANGE",
  NSFW_SET = "@global/NSFW_SET",
}

export interface ThemeChangeAction {
  type: ActionTypes.THEME_CHANGE;
  theme: Theme;
}

export interface IntroHideAction {
  type: ActionTypes.INTRO_HIDE;
}

export interface ListStyleChangeAction {
  type: ActionTypes.LIST_STYLE_CHANGE;
  listStyle: ListStyle;
}

export interface NewVersionChangeAction {
  type: ActionTypes.NEW_VERSION_CHANGE;
  version: string | null;
}

export interface NotificationsMuteAction {
  type: ActionTypes.NOTIFICATIONS_MUTE;
}

export interface NotificationsUnMuteAction {
  type: ActionTypes.NOTIFICATIONS_UNMUTE;
}

export interface CurrencySetAction {
  type: ActionTypes.CURRENCY_SET;
  currency: string;
  currencyRate: number;
  currencyPrecision: number;
  currencySymbol: string;
}

export interface LangSetAction {
  type: ActionTypes.LANG_SET;
  lang: string;
}

export interface NsfwSetAction {
  type: ActionTypes.NSFW_SET;
  value: boolean;
}

export interface HasKeyChainAction {
  type: ActionTypes.HAS_KEYCHAIN;
}

export type Actions =
  | LocationChangeAction
  | ThemeChangeAction
  | IntroHideAction
  | ListStyleChangeAction
  | NewVersionChangeAction
  | NotificationsMuteAction
  | NotificationsUnMuteAction
  | CurrencySetAction
  | LangSetAction
  | NsfwSetAction
  | HasKeyChainAction
  | HEIncludeAction
  | HEFetchAction;
