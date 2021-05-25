import {Dispatch} from "redux";

import {Account, Accounts, Actions, ActionTypes, AddAction} from "./types";

import {getAccountHEFull} from "../../api/hive-engine";

export const initialState: Accounts = [];

export default (state: Accounts = initialState, action: Actions): Accounts => {
    switch (action.type) {
        case ActionTypes.ADD: {
            const {data} = action;

            return [...state.filter((x) => x.name !== data.name), data];
        }
        default:
            return state;
    }
};

/* Actions */
export const addAccount = (data: Account) => (dispatch: Dispatch) => {
    dispatch(addAct(data));

    if (data.__loaded) {
        dispatch(addAct(data));
        return;
    }

    getAccountHEFull(data.name, true).then((a) => {
        dispatch(addAct(a));
    });
};

/* Action Creators */
export const addAct = (data: Account): AddAction => {
    return {
        type: ActionTypes.ADD,
        data,
    };
};
