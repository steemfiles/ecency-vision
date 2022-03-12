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
  GetAction,
  ResetAction,
  SetOldestTxAction,
  UpdatedAction,
} from "./types";
import { getAccountHistory } from "../../api/hive";
import * as ls from "../../util/local-storage";

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
  group: (() => {
    const storedText = ls.get("profile-transactions-group") || "";
    if (storedText !== "") {
      try {
        console.log(storedText);
        const parsedText = JSON.parse(storedText);
        if (Object.keys(ACCOUNT_OPERATION_GROUPS).includes(parsedText)) {
          return parsedText;
        }
      } catch (e) {
        console.error(e.message, `"${storedText}"`);
      }
    }
    return "";
  })(),
  newest: 0,
  oldest: 1e18,
};

export default (
  state: Transactions = initialState,
  action: Actions
): Transactions => {
  switch (action.type) {
    case ActionTypes.GET: {
      return { ...state, loading: true };
    }
    case ActionTypes.UPDATED: {
      let { newest, oldest } = action;
      const { transactions } = action;
      if (action.group != state.group) {
        // The user changed the group while this program was fetching
        return { ...state, loading: false };
      }
      const old_list = state.list;
      let throw_away_start: number = -1;
      if (newest != null) {
        for (let i: number = 0; i < transactions.length; ++i) {
          if (transactions[i].num === newest) {
            throw_away_start = i;
          }
        }
      }

      if (oldest) {
        let nums_present: { [n: number]: boolean } = {};
        let new_list = [...old_list];
        new_list.forEach(function (value) {
          nums_present[value.num] = true;
        });

        transactions.forEach(function (value) {
          if (!nums_present[value.num]) {
            new_list.push(value);
          }
        });
        const list = new_list;
        //.sort((a: any, b: any) => b.num - a.num);
        return { ...state, list, oldest, loading: false };
      } else if (newest && throw_away_start == 0) {
        console.log("Nothing new....");
        return state;
      } else if (newest) {
        const list = (() => {
          if (throw_away_start > 0) {
            return [...transactions.slice(0, throw_away_start), ...old_list];
          } else {
            return [...transactions, ...old_list];
          }
        })();
        return { ...state, list, newest, loading: false };
      }

      return state;
    }
    case ActionTypes.FETCH: {
      const { group } = action;
      ls.set("profile-transactions-group", JSON.stringify(group));
      return {
        ...state,
        group,
        list: [],
        loading: true,
      };
    }
    case ActionTypes.FETCHED: {
      const { oldest, newest, group } = state;
      return {
        ...state,
        list: action.transactions,
        loading: false,
        oldest,
        newest: action.transactions.length
          ? action.transactions[0].num
          : newest,
      };
    }
    case ActionTypes.FETCH_ERROR: {
      return {
        ...initialState,
        group: state.group,
      };
    }
    case ActionTypes.RESET: {
      return { ...initialState };
    }
    case ActionTypes.SET_OLDEST_TX: {
      const { oldest } = action;
      return { ...state, oldest, loading: false };
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
const handleCommonActionError =
  (username: string, group: OperationGroup | "", e: { message: string }) =>
  (dispatch: Dispatch) => {
    if (
      e.message.startsWith(
        "total_processed_items < 2000: Could not find filtered operation in 2000 operations, to continue searching, set start="
      )
    ) {
      const segments = e.message.split(/=/);
      const newStart = parseInt(segments[1]);
      dispatch(setOldestTransactionAct(newStart));
      getMoreTransactions(username, group, newStart);
    } else {
      console.log("catch", e);
      dispatch(fetchErrorAct());
    }
  };

export const fetchTransactions =
  (username: string, group: OperationGroup | "" = "") =>
  (dispatch: Dispatch) => {
    dispatch(fetchAct(group));

    const handleFetch = (r: Array<any>) => {
      console.log("fetching Txs");
      const mapped: Array<Transaction> = r.map((x: any): Transaction => {
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

      let newest: number = initialState.newest;
      let oldest: number = initialState.oldest;
      if (transactions.length) {
        if (transactions[0].num > newest) {
          newest = transactions[0].num;
        }
        if (transactions[transactions.length - 1].num < oldest) {
          oldest = transactions[transactions.length - 1].num;
        }
      } else {
        // empty...
        console.log("No transactions returned but no exception thrown");
      }

      dispatch(fetchedAct(transactions, oldest, newest));
    };

    const name = username.replace("@", "");
    const filters: any[] = filterForGroup(group);
    console.log(filters);

    getAccountHistory(name, filters)
      .then(handleFetch)
      .catch((e) => {
        console.error(e.message);
        if (
          e.message.startsWith(
            "total_processed_items < 2000: Could not find filtered operation in 2000 operations, to continue searching, set start="
          )
        ) {
          const segments = e.message.split(/=/);
          const newStart = parseInt(segments[1]);
          const limit = 498 >= newStart ? newStart + 1 : 500;
          hiveClient
            .call("condenser_api", "get_account_history", [
              name,
              newStart,
              limit,
              ...filters,
            ])
            .then(handleFetch);
        } else if (
          e.message.startsWith(
            "args.start >= args.limit-1: start must be greater than or equal to limit-1 (start is 0-based index)"
          )
        ) {
          dispatch(setOldestTransactionAct(0));
        } else {
          console.log("catch", e);
          dispatch(fetchErrorAct());
        }
      });
  };

export const updateTransactions =
  (
    username: string,
    group: OperationGroup | "",
    most_recent_transaction_num: number
  ) =>
  (dispatch: Dispatch) => {
    dispatch(getAct());

    const name = username.replace("@", "");
    const filters: any[] = filterForGroup(group);

    hiveClient
      .call("condenser_api", "get_account_history", [
        name,
        most_recent_transaction_num + 900,
        900,
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

        dispatch(
          updatedAct(null, most_recent_transaction_num, group, transactions)
        );
      })
      .catch((e) => {
        console.log("catch", e);
        if (
          e.message.startsWith(
            "total_processed_items < 2000: Could not find filtered operation in 2000 operations, to continue searching, set start="
          )
        ) {
          const segments = e.message.split(/=/);
          const newStart = parseInt(segments[1]);
          dispatch(setOldestTransactionAct(newStart));
          getMoreTransactions(username, group, newStart);
        } else {
          console.log("catch", e);
          dispatch(fetchErrorAct());
        }
      });
  };

export const getMoreTransactions =
  (
    username: string,
    group: OperationGroup | "",
    oldest_transaction_num: number,
    initialFetch: boolean = false
  ) =>
  (dispatch: Dispatch) => {
    dispatch(getAct());

    const name = username.replace("@", "");
    const filters: any[] = filterForGroup(group);

    console.log("Searching from ", oldest_transaction_num + 1);
    if (oldest_transaction_num <= 0) {
      dispatch(updatedAct(null, null, group, []));
      return;
    }

    const startingPoint = oldest_transaction_num - 1;
    const limit = (() => {
      const tentativeLimit = 500;
      if (tentativeLimit - startingPoint >= 2) {
        return startingPoint + 1;
      } else {
        return tentativeLimit;
      }
    })();

    return hiveClient
      .call("condenser_api", "get_account_history", [
        name,
        startingPoint,
        limit,
        ...filters,
      ])
      .then((r: any) => {
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

        if (transactions.length) {
          const new_oldest = transactions[transactions.length - 1].num;
          dispatch(updatedAct(new_oldest, null, group, transactions));
        } else {
          // do nothing...
          dispatch(updatedAct(null, null, group, []));
        }
      })
      .catch((e) => {
        if (
          e.message.startsWith(
            "total_processed_items < 2000: Could not find filtered operation in 2000 operations, to continue searching, set start="
          )
        ) {
          const segments = e.message.split(/=/);
          const newStart = parseInt(segments[1]);
          dispatch(setOldestTransactionAct(newStart));
          getMoreTransactions(username, group, newStart);
        } else if (
          e.message.startsWith(
            "args.start >= args.limit-1: start must be greater than or equal to limit-1 (start is 0-based index)"
          )
        ) {
          dispatch(setOldestTransactionAct(0));
        } else {
          console.log("catch", e);
          dispatch(fetchErrorAct());
        }
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

export const fetchedAct = (
  transactions: Transaction[],
  oldest: number,
  newest: number
): FetchedAction => {
  return {
    type: ActionTypes.FETCHED,
    transactions,
    oldest,
    newest,
  };
};

export const getAct = (): GetAction => {
  return {
    type: ActionTypes.GET,
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

export const setOldestTransactionAct = (oldest: number): SetOldestTxAction => {
  return {
    type: ActionTypes.SET_OLDEST_TX,
    oldest,
  };
};

export const updatedAct = (
  oldest: number | null,
  newest: number | null,
  group: OperationGroup | "",
  transactions: Transaction[]
): UpdatedAction => {
  return {
    type: ActionTypes.UPDATED,
    newest,
    oldest,
    group,
    transactions,
  };
};
