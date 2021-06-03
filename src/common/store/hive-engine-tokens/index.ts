import {Dispatch} from "redux";
import {Actions, ActionTypes, IncludeAction, TokenToInfoConfigPairMap} from "./types";
import {AppState} from "../index";
import {getTrendingTags} from "../../api/hive";
import {fetchAct, fetchedAct, fetchErrorAct} from "../trending-tags";
export const initialState: TokenToInfoConfigPairMap = {};

export default (state: TokenToInfoConfigPairMap = initialState, action: Actions): TokenToInfoConfigPairMap => {
    switch (action.type) {
        case ActionTypes.INCLUDE: {
            const {data} = action;

            return Object.assign(state,data);
        }
        default:
            return state;
    }
};

/* Actions */
export const includeInfoConfigs = (data: TokenToInfoConfigPairMap) => (dispatch: Dispatch) => {
    dispatch(includeInfoConfigsAction(data));
};

/* Action Creators */
export const includeInfoConfigsAction = (data: TokenToInfoConfigPairMap): IncludeAction => {
    return {
        type: ActionTypes.INCLUDE,
        data,
    };
};
