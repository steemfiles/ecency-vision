import { Dispatch } from "redux";

import { Account, Accounts, Actions, ActionTypes, AddAction } from "./types";

import { FullHiveEngineAccount, getAccountHEFull } from "../../api/hive-engine";

export const initialState: Accounts = [];

export default (state: Accounts = initialState, action: Actions): Accounts => {
  switch (action.type) {
    case ActionTypes.ADD: {
      const { data } = action;

      let heA: FullHiveEngineAccount;

      // Don't add accounts that aren't Full Hive Engine Accounts.
      // @ts-ignore

      if (!(heA = data).token_balances) {
        getAccountHEFull(heA.name, true).then((x) => {
          addAccount(x);
        });
        return state;
      }

      return [...state.filter((x) => x.name !== data.name), data];
    }
    default:
      return state;
  }
};

/* Actions */
export const addAccount = (data: Account) => (dispatch: Dispatch) => {
  dispatch(addAct(data));

  // @ts-ignore
  if (!data.token_balances)
    getAccountHEFull(data.name, true).then((a) => {
      dispatch(addAct(a));
    });

  if (data.__loaded) {
    dispatch(addAct(data));
    return;
  }
};

/* Action Creators */
export const addAct = (data: Account): AddAction => {
  return {
    type: ActionTypes.ADD,
    data,
  };
};
