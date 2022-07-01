import { Dispatch } from "redux";
import { utils } from "@hiveio/dhive";

import {
  OperationGroup,
  Transaction,
  Transactions,
  Actions,
  ActionTypes,
  FetchAction,
  FetchedAction,
  FetchErrorAction,
  ResetAction,
} from "./types";
import { getAccountHistory } from "../../api/hive";

const ops = utils.operationOrders;

export const ACCOUNT_OPERATION_GROUPS: Record<OperationGroup, number[]> = {
  transfers: [
    ops.transfer,
    ops.transfer_to_savings,
    ops.cancel_transfer_from_savings,
    ops.recurrent_transfer,
    ops.fill_recurrent_transfer,
  ],
  "market-orders": [
    ops.fill_convert_request,
    ops.fill_order,
    ops.fill_collateralized_convert_request,
    ops.limit_order_create2,
    ops.limit_order_create,
    ops.limit_order_cancel,
  ],
  interests: [ops.interest],
  "stake-operations": [
    ops.return_vesting_delegation,
    ops.withdraw_vesting,
    ops.transfer_to_vesting,
    ops.set_withdraw_vesting_route,
    ops.update_proposal_votes,
    ops.fill_vesting_withdraw,
    ops.account_witness_proxy,
  ],
  rewards: [
    ops.author_reward,
    ops.curation_reward,
    ops.producer_reward,
    ops.claim_reward_balance,
    ops.comment_benefactor_reward,
    ops.proposal_pay,
    ops.liquidity_reward,
    ops.comment_reward,
  ],
  //socials: [
  //  ops.vote,
  //  ops.custom_json,
  //  ops.request_account_recovery,
  //  ops.recover_account,
  //  ops.change_recovery_account,
  //  ops.account_update2,
  //  ops.changed_recovery_account,
  //  ops.system_warning,
  //  ops.comment,
  //],
};

const ALL_ACCOUNT_VALUES_OF_VALUES: Array<Array<number>> = Object.values(
  ACCOUNT_OPERATION_GROUPS
);

const flat = function (that: Array<Array<number>>): Array<number> {
  var acc: Array<number> = [];
  for (let i = 0; i < that.length; ++i) {
    acc = [...that[i], ...acc];
  }
  return acc;
};

const ALL_ACCOUNT_OPERATIONS = flat(ALL_ACCOUNT_VALUES_OF_VALUES);

export const initialState: Transactions = {
  list: [],
  loading: false,
  group: "",
};

export default (
  state: Transactions = initialState,
  action: Actions
): Transactions => {
  switch (action.type) {
    case ActionTypes.FETCH: {
      return {
        ...state,
        group: action.group,
        list: [],
        loading: true,
      };
    }
    case ActionTypes.FETCHED: {
      return {
        ...state,
        list: action.transactions,
        loading: false,
      };
    }
    case ActionTypes.FETCH_ERROR: {
      return {
        ...state,
        list: [],
        loading: false,
      };
    }
    case ActionTypes.RESET: {
      return { ...initialState };
    }
    default:
      return state;
  }
};

/* Actions */
export const fetchTransactions =
  (username: string, group: OperationGroup | "" = "") =>
  (dispatch: Dispatch) => {
    dispatch(fetchAct(group));

    const name = username.replace("@", "");

    let filters: any[] = [];
    switch (group) {
      case "transfers":
        filters = utils.makeBitMaskFilter(
          ACCOUNT_OPERATION_GROUPS["transfers"]
        );
        break;
      case "market-orders":
        filters = utils.makeBitMaskFilter(
          ACCOUNT_OPERATION_GROUPS["market-orders"]
        );
        break;
      case "interests":
        filters = utils.makeBitMaskFilter(
          ACCOUNT_OPERATION_GROUPS["interests"]
        );
        break;
      case "stake-operations":
        filters = utils.makeBitMaskFilter(
          ACCOUNT_OPERATION_GROUPS["stake-operations"]
        );
        break;
      case "rewards":
        filters = utils.makeBitMaskFilter(ACCOUNT_OPERATION_GROUPS["rewards"]);
        break;
      //case "socials":
      //  filters = utils.makeBitMaskFilter(ACCOUNT_OPERATION_GROUPS["socials"]);
      //  break;
      default:
        filters = utils.makeBitMaskFilter(ALL_ACCOUNT_OPERATIONS); // all
    }

    getAccountHistory(name, filters)
      .then((r) => {
        const mapped: Transaction[] = r.map((x: any): Transaction[] | null => {
          const { op } = x[1];
          const { timestamp, trx_id } = x[1];
          const opName = op[0];
          const opData = op[1];

          return {
            num: x[0],
            type: opName,
            timestamp,
            trx_id,
            ...opData,
          };
        });

        const transactions: Transaction[] = mapped
          .filter((x) => x !== null)
          .sort((a: any, b: any) => b.num - a.num);

        dispatch(fetchedAct(transactions));
      })
      .catch(() => {
        console.log("catch");
        dispatch(fetchErrorAct());
      });
  };

export const resetTransactions = () => (dispatch: Dispatch) => {
  dispatch(resetAct());
};

/* Action Creators */
export const fetchAct = (group: OperationGroup | ""): FetchAction => {
  return {
    type: ActionTypes.FETCH,
    group,
  };
};

export const fetchedAct = (transactions: Transaction[]): FetchedAction => {
  return {
    type: ActionTypes.FETCHED,
    transactions,
  };
};

export const fetchErrorAct = (): FetchErrorAction => {
  return {
    type: ActionTypes.FETCH_ERROR,
  };
};

export const resetAct = (): ResetAction => {
  return {
    type: ActionTypes.RESET,
  };
};
