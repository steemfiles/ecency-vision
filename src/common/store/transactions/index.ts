import { Dispatch } from "redux";
import { utils } from "@hiveio/dhive";
import { hiveClient } from "../../api/hive";
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
  UpdateAction,
  UpdatedAction,
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

const ALL_ACCOUNT_OPERATIONS = [
  ...Object.values(ACCOUNT_OPERATION_GROUPS),
].flat();

export const initialState: Transactions = {
  list: [],
  // load and show that the loading is happening.
  loading: false,
  // updating happens without any explicit show
  // should also be true when loading.
  group: "",
};

export default (
  state: Transactions = initialState,
  action: Actions
): Transactions => {
  switch (action.type) {
    case ActionTypes.UPDATED: {
      const { last_transaction_id, transactions } = action;
      if (action.group != state.group) {
        // The user changed the group while this program was fetching
        return state;
      }
      const old_list = state.list;
      let throw_away_start: number = -1;
      for (let i: number = 0; i < transactions.length; ++i) {
        if (transactions[i].num === last_transaction_id) {
          throw_away_start = i;
        }
      }

      if (throw_away_start == 0) {
        console.log("Nothing new....");
        return state;
      } else {
        const list = (() => {
          if (throw_away_start > 0) {
            return [...transactions.slice(0, throw_away_start), ...old_list];
          } else {
            return [...transactions, ...old_list];
          }
        })();
        return { ...state, list };
      }
    }
    case ActionTypes.FETCH: {
      const { group } = action;
      return {
        ...state,
        group,
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
    case ActionTypes.UPDATE: {
      return state;
    }
    default:
      return state;
  }
};

function filterForGroup(group: OperationGroup | "") {
  switch (group) {
    case "transfers":
      return utils.makeBitMaskFilter(ACCOUNT_OPERATION_GROUPS["transfers"]);
    case "market-orders":
      return utils.makeBitMaskFilter(ACCOUNT_OPERATION_GROUPS["market-orders"]);
    case "interests":
      return utils.makeBitMaskFilter(ACCOUNT_OPERATION_GROUPS["interests"]);
    case "stake-operations":
      return utils.makeBitMaskFilter(
        ACCOUNT_OPERATION_GROUPS["stake-operations"]
      );
    case "rewards":
      return utils.makeBitMaskFilter(ACCOUNT_OPERATION_GROUPS["rewards"]);
    //case "socials":
    //  return utils.makeBitMaskFilter(ACCOUNT_OPERATION_GROUPS["socials"]);
    //
    default:
      return utils.makeBitMaskFilter(ALL_ACCOUNT_OPERATIONS); // all
  }
}

/* Actions */
export const fetchTransactions =
  (username: string, group: OperationGroup | "" = "") =>
  (dispatch: Dispatch) => {
    dispatch(fetchAct(group));

    const name = username.replace("@", "");
    const filters: any[] = filterForGroup(group);

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

export const updateTransactions =
  (
    username: string,
    group: OperationGroup | "",
    most_recent_transaction_num: number
  ) =>
  (dispatch: Dispatch) => {
    dispatch(updateAct());

    const name = username.replace("@", "");
    const filters: any[] = filterForGroup(group);

    hiveClient
      .call("condenser_api", "get_account_history", [
        name,
        most_recent_transaction_num + 500,
        500,
        ...filters,
      ])
      .then((r: any) => {
        console.log({ r });
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

        dispatch(updatedAct(most_recent_transaction_num, group, transactions));
      })
      .catch((e) => {
        console.log("catch", e);
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

export const updateAct = (): UpdateAction => {
  return {
    type: ActionTypes.UPDATE,
  };
};

export const updatedAct = (
  last_transaction_id: number,
  group: OperationGroup | "",
  transactions: Transaction[]
): UpdatedAction => {
  return {
    type: ActionTypes.UPDATED,
    last_transaction_id,
    group,
    transactions,
  };
};
