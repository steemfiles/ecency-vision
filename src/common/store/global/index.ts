import Cookies from "js-cookie";
import { Dispatch } from "redux";
import defaults from "../../constants/site.json";
import { AppState } from "../index";
import {
  Actions,
  ActionTypes,
  AllFilter,
  Global,
  HasKeyChainAction,
  IntroHideAction,
  ListStyle,
  ListStyleChangeAction,
  NewVersionChangeAction,
  NotificationsMuteAction,
  NotificationsUnMuteAction,
  CurrencySetAction,
  LangSetAction,
  NsfwSetAction,
  Theme,
  ThemeChangeAction,
} from "./types";
import { CommonActionTypes } from "../common";
import * as ls from "../../util/local-storage";
import filterTagExtract from "../../helper/filter-tag-extract";
import { TokenPropertiesMap } from "../hive-engine-tokens/types";
import { HEActionTypes, HEActions } from "../hive-engine-tokens/types";
import { includeInfoConfigsAction } from "../hive-engine-tokens";
export const initialState: Global = {
  filter: AllFilter[defaults.filter],
  tag: "",
  theme: Theme[defaults.theme],
  listStyle: ListStyle[defaults.listStyle],
  intro: true,
  currency: defaults && defaults.currency && defaults.currency.currency,
  currencyRate: defaults && defaults.currency && defaults.currency.rate,
  currencyPrecision:
    defaults && defaults.currency && defaults.currency.precision,
  currencySymbol: defaults && defaults.currency && defaults.currency.symbol,
  lang: "en-US",
  searchIndexCount: 0,
  canUseWebp: false,
  hasKeyChain: false,
  isElectron: false,
  newVersion: null,
  notifications: true,
  nsfw: false,
  isMobile: false,
  usePrivate: true,
  hiveEngineTokensProperties: {},
};
export default (state: Global = initialState, action: Actions): Global => {
  switch (action.type) {
    case CommonActionTypes.LOCATION_CHANGE: {
      const { pathname } = action.payload.location;
      const params = filterTagExtract(pathname);
      if (!params) {
        return state;
      }
      const { filter, tag } = params;
      return { ...state, filter: AllFilter[filter] || "", tag: tag };
    }
    case ActionTypes.THEME_CHANGE: {
      const { theme } = action;
      return { ...state, theme };
    }
    case ActionTypes.INTRO_HIDE: {
      return { ...state, intro: false };
    }
    case ActionTypes.LIST_STYLE_CHANGE: {
      const { listStyle } = action;
      return { ...state, listStyle };
    }
    case ActionTypes.NEW_VERSION_CHANGE: {
      const { version } = action;
      return { ...state, newVersion: version };
    }
    case ActionTypes.NOTIFICATIONS_MUTE: {
      return { ...state, notifications: false };
    }
    case ActionTypes.NOTIFICATIONS_UNMUTE: {
      return { ...state, notifications: true };
    }
    case ActionTypes.CURRENCY_SET: {
      const { currency, currencyRate, currencyPrecision, currencySymbol } =
        action;
      return {
        ...state,
        currency,
        currencyRate,
        currencyPrecision,
        currencySymbol,
      };
    }
    case ActionTypes.LANG_SET: {
      const { lang } = action;
      return { ...state, lang };
    }
    case ActionTypes.NSFW_SET: {
      const { value } = action;
      return { ...state, nsfw: value };
    }
    case ActionTypes.HAS_KEYCHAIN: {
      return { ...state, hasKeyChain: true };
    }
    case HEActionTypes.INCLUDE: {
      let NewHETP = action.data;
      const OldHETP = state.hiveEngineTokensProperties;
      try {
        if (!NewHETP) {
          return state;
        }
        if (OldHETP) {
          NewHETP = Object.assign(NewHETP, OldHETP);
        }
      } catch (e) {
        console.log("Error loading new HE");
      }
      console.log("Returning Hive Engine data");
      console.log({ hiveEngineTokensProperties: NewHETP });
      return { ...state, hiveEngineTokensProperties: NewHETP };
    }
    default:
      return state;
  }
};
/* Actions */
export const toggleTheme =
  () => (dispatch: Dispatch, getState: () => AppState) => {
    const { global } = getState();
    const { theme } = global;
    const newTheme = theme === Theme.day ? Theme.night : Theme.day;
    ls.set("theme", newTheme);
    Cookies.set("theme", newTheme);
    dispatch(themeChangeAct(newTheme));
  };
export const toggleListStyle =
  () => (dispatch: Dispatch, getState: () => AppState) => {
    const { global } = getState();
    const { listStyle } = global;
    const newStyle =
      listStyle === ListStyle.row ? ListStyle.grid : ListStyle.row;
    ls.set("list-style", newStyle);
    Cookies.set("list-style", newStyle);
    dispatch(listStyleChangeAct(newStyle));
  };
export const hideIntro = () => (dispatch: Dispatch) => {
  ls.set("hide-intro", "1");
  Cookies.set("hide-intro", "1");
  dispatch(hideIntroAct());
};
export const dismissNewVersion = () => (dispatch: Dispatch) => {
  dispatch(newVersionChangeAct(null));
};
export const muteNotifications = () => (dispatch: Dispatch) => {
  ls.set("notifications", false);
  dispatch(muteNotificationsAct());
};
export const unMuteNotifications = () => (dispatch: Dispatch) => {
  ls.set("notifications", true);
  dispatch(unMuteNotificationsAct());
};
export const setCurrency =
  (currency: string, rate: number, symbol: string) => (dispatch: Dispatch) => {
    ls.set("currency", currency);
    dispatch(setCurrencyAct(currency, rate, symbol));
  };
export const setLang = (lang: string) => (dispatch: Dispatch) => {
  ls.set("lang", lang);
  dispatch(setLangAct(lang));
};
export const setNsfw = (value: boolean) => (dispatch: Dispatch) => {
  ls.set("nsfw", value);
  dispatch(setNsfwAct(value));
};
export const setHiveEngineTokensProperties =
  (hiveEngineTokensProperties: TokenPropertiesMap) => (dispatch: Dispatch) => {
    dispatch(includeInfoConfigsAction(hiveEngineTokensProperties));
  };
/* Action Creators */
export const themeChangeAct = (theme: Theme): ThemeChangeAction => {
  return {
    type: ActionTypes.THEME_CHANGE,
    theme,
  };
};
export const hideIntroAct = (): IntroHideAction => {
  return {
    type: ActionTypes.INTRO_HIDE,
  };
};
export const listStyleChangeAct = (
  listStyle: ListStyle
): ListStyleChangeAction => {
  return {
    type: ActionTypes.LIST_STYLE_CHANGE,
    listStyle,
  };
};
export const newVersionChangeAct = (
  version: string | null
): NewVersionChangeAction => {
  return {
    type: ActionTypes.NEW_VERSION_CHANGE,
    version,
  };
};
export const muteNotificationsAct = (): NotificationsMuteAction => {
  return {
    type: ActionTypes.NOTIFICATIONS_MUTE,
  };
};
export const unMuteNotificationsAct = (): NotificationsUnMuteAction => {
  return {
    type: ActionTypes.NOTIFICATIONS_UNMUTE,
  };
};
export const setCurrencyAct = (
  currency: string,
  currencyRate: number,
  currencySymbol: string
): CurrencySetAction => {
  console.log(currencyRate, currency + "/$");
  const currencyPrecision = (() => {
    if (!currencyRate) return 8;

    let RoughPrecision = Math.round(-Math.log10(currencyRate)) + 3;
    if (RoughPrecision < 0) {
      return 0;
    }

    return RoughPrecision;
  })();

  console.log({ currencyPrecision });
  return {
    type: ActionTypes.CURRENCY_SET,
    currency,
    currencyRate,
    currencyPrecision,
    currencySymbol,
  };
};
export const setLangAct = (lang: string): LangSetAction => {
  return {
    type: ActionTypes.LANG_SET,
    lang,
  };
};
export const setNsfwAct = (value: boolean): NsfwSetAction => {
  return {
    type: ActionTypes.NSFW_SET,
    value,
  };
};
export const hasKeyChainAct = (): HasKeyChainAction => {
  return {
    type: ActionTypes.HAS_KEYCHAIN,
  };
};
