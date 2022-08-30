import { Dispatch } from "redux";
import {
  HEActions,
  HEActionTypes,
  HEFetchAction,
  HEIncludeAction,
  TokenPropertiesMap,
} from "./types";
import { AppState } from "../index";
import { getDynamicProps, getTrendingTags } from "../../api/hive";
import { fetchAct, fetchErrorAct } from "../trending-tags";

import { LIQUID_TOKEN_UPPERCASE } from "../../../client_config";
export const initialState: TokenPropertiesMap = {};
export default (
  state: TokenPropertiesMap = initialState,
  action: HEActions
): TokenPropertiesMap => {
  switch (action.type) {
    case HEActionTypes.INCLUDE: {
      const { data } = action;
      return Object.assign(state, data);
    }
    case HEActionTypes.FETCH: {
      // should call a fetch routine here.
      return state;
    }
    default:
      return state;
  }
};
/* HEActions */
export const includeInfoConfigs =
  (data: TokenPropertiesMap) => (dispatch: Dispatch) => {
    dispatch(includeInfoConfigsAction(data));
  };
/* Action Creators */
export const includeInfoConfigsAction = (
  data: TokenPropertiesMap
): HEIncludeAction => {
  return {
    type: HEActionTypes.INCLUDE,
    data,
  };
};
/* Action Creators */
export const fetchedAct = (_map: TokenPropertiesMap): HEFetchAction => {
  return {
    type: HEActionTypes.FETCH,
  };
};
