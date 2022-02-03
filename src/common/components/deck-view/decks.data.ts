import { communities, hot, magnifySvg, notifications } from "../../img/svg";
import { HotListItem, SearchListItem } from "../deck/deck-items";
import { hotListItems, notificationListItems, searchListItems, tagsListItems } from "../deck/mockData";

export const decks = [
    {data: hotListItems, listItemComponent: HotListItem, header: {title: "Trending", icon: hot}},
    {data: searchListItems, listItemComponent: SearchListItem, header: {title: "Games", icon: magnifySvg}},
    {data: tagsListItems, listItemComponent: SearchListItem, header: {title: "@gems", icon: communities}},
    {data: notificationListItems, listItemComponent: SearchListItem, header: {title: "mentions, replies", icon: notifications}},
]