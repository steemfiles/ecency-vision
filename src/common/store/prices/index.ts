import {Dispatch} from "redux";
import {Actions, ActionTypes, IncludeAction, PriceHash} from "./types";
export const initialState: PriceHash = {'POB': 1.70};

export default (state: PriceHash = initialState, action: Actions): PriceHash => {
    switch (action.type) {
        case ActionTypes.INCLUDE: {
            const {data} = action;

            return Object.assign(state,data);;
        }
        default:
            return state;
    }
};

/* Actions */
export const addPrices = (data: PriceHash) => (dispatch: Dispatch) => {
    dispatch(addPricesAction(data));
};

/* Action Creators */
export const addPricesAction = (data: PriceHash): IncludeAction => {
    return {
        type: ActionTypes.INCLUDE,
        data,
    };
};
