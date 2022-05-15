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

interface HiveRPCError {
  name: "RPCError";
  jse_shortmsg: string;
  jse_info: {
    code: number;
    name: string;
    message: string;
    stack: Array<{ data: { sequence: number } }>;
  };
}

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

      if (newest && throw_away_start == 0) {
        console.log("Nothing new....");
        return state;
      } else {
        let nums_present: { [n: number]: boolean } = {};
        let list: Transaction[] = [];
        const includeInList = (value: Transaction) => {
          if (!nums_present[value.num]) {
            nums_present[value.num] = true;
            list.push(value);
          }
        };

        if (oldest) {
          // include loaded transactions *after*
          let newest = state.newest;
          if (newest < oldest) {
            newest = oldest;
          }
          old_list.forEach(includeInList);
          transactions.forEach(includeInList);
          return { ...state, newest, list, oldest, loading: false };
        } else if (newest) {
          // include loaded transactions *before*
          transactions.forEach(includeInList);
          old_list.forEach(includeInList);
          let { oldest } = state;
          if (oldest > newest) {
            oldest = newest;
          }
          return { ...state, oldest, list, newest, loading: false };
        }
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

    const handleError = (e: HiveRPCError) => {
      const jse_info = e.jse_info;
      const code = jse_info.code;
      if (code === 10) {
        const newStart = jse_info.stack[0].data.sequence;
        getMoreTransactions(username, group, newStart)(dispatch);
      } else if (
        e.jse_shortmsg.startsWith(
          "args.start >= args.limit-1: start must be greater than or equal to limit-1 (start is 0-based index)"
        )
      ) {
        dispatch(setOldestTransactionAct(0));
      } else {
        dispatch(fetchErrorAct());
      }
    };

    const name = username.replace("@", "");
    const filters: any[] = filterForGroup(group);

    getAccountHistory(name, filters).then(handleFetch).catch(handleError);
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
      .catch((e: HiveRPCError) => {
        if (
          e.jse_shortmsg.startsWith(
            "total_processed_items < 2000: Could not find filtered operation in 2000 operations, to continue searching, set start="
          )
        ) {
          const segments = e.jse_shortmsg.split(/=/);
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
      .catch((e: HiveRPCError) => {
        if (
          e.jse_shortmsg.startsWith(
            "total_processed_items < 2000: Could not find filtered operation in 2000 operations, to continue searching, set start="
          )
        ) {
          const segments = e.jse_shortmsg.split(/=/);
          const newStart = parseInt(segments[1]);
          dispatch(setOldestTransactionAct(newStart));
        } else if (
          e.jse_shortmsg.startsWith(
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

export const setTransactions = (t: Transactions) => (dispatch: Dispatch) => {
  dispatch(updatedAct(t.oldest, t.newest, t.group, t.list));
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
