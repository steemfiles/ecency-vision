import { LocationChangeAction } from "../common";

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
}

export enum ProfileFilter {
  blog = "blog",
  comments = "comments",
  replies = "replies",
}

// TODO: Find a proper way to merge EntryFilter and ProfileFilter
export enum AllFilter {
  trending = "trending",
  hot = "hot",
  created = "created",
  blog = "blog",
  comments = "comments",
  replies = "replies",
  feed = "feed"
}

export interface Global {
  filter: EntryFilter | ProfileFilter | AllFilter;
  tag: string;
  theme: Theme;
  listStyle: ListStyle;
  intro: boolean;
  currency: string;
  currencyRate: number;
  currencySymbol: string;
}

export enum ActionTypes {
  THEME_CHANGE = "@global/THEME_CHANGE",
  INTRO_HIDE = "@global/INTRO_HIDE",
  LIST_STYLE_CHANGE = "@global/LIST_STYLE_CHANGE",
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

export type Actions = LocationChangeAction | ThemeChangeAction | IntroHideAction | ListStyleChangeAction;
