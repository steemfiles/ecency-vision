import hs from "hivesigner";
import {
  PrivateKey,
  Operation,
  TransactionConfirmation,
  AccountUpdateOperation,
  CustomJsonOperation,
  Client,
} from "@hiveio/dhive";
import { Parameters } from "hive-uri";
import { hiveClient, HIVE_API_NAME } from "./hive";
import { Account } from "../store/accounts/types";
import { usrActivity } from "./private-api";
import { getAccessToken, getPostingKey } from "../helper/user-token";
import * as keychain from "../helper/keychain";
import parseAsset from "../helper/parse-asset";
import { hotSign } from "../helper/hive-signer";
// Base Layer 1 token name
import { _t } from "../i18n";
export interface MetaData {
  links?: string[];
  image?: string[];
  users?: string[];
  tags?: string[];
  app?: string;
  format?: string;
  community?: string;
}
export interface BeneficiaryRoute {
  account: string;
  weight: number;
}
export interface CommentOptions {
  allow_curation_rewards: boolean;
  allow_votes: boolean;
  author: string;
  permlink: string;
  max_accepted_payout: string;
  percent_hbd: number;
  extensions: Array<[0, { beneficiaries: BeneficiaryRoute[] }]>;
}
export type RewardType = "default" | "sp" | "dp";
const handleChainError = (strErr: string) => {
  if (/You may only post once every/.test(strErr)) {
    return _t("chain-error.min-root-comment");
  } else if (/Your current vote on this comment is identical/.test(strErr)) {
    return _t("chain-error.identical-vote");
  } else if (/Please wait to transact, or power up/.test(strErr)) {
    return _t("chain-error.insufficient-resource");
  } else if (/Cannot delete a comment with net positive/.test(strErr)) {
    return _t("chain-error.delete-comment-with-vote");
  } else if (/comment_cashout/.test(strErr)) {
    return _t("chain-error.comment-cashout");
  } else if (
    /Votes evaluating for comment that is paid out is forbidden/.test(strErr)
  ) {
    return _t("chain-error.paid-out-post-forbidden");
  }
  return null;
};
export const formatError = (err: any): string => {
  let chainErr = handleChainError(err.toString());
  if (chainErr) {
    return chainErr;
  }
  if (err.error_description && typeof err.error_description === "string") {
    let chainErr = handleChainError(err.error_description);
    if (chainErr) {
      return chainErr;
    }
    return err.error_description.substring(0, 80);
  }
  if (err.message && typeof err.message === "string") {
    let chainErr = handleChainError(err.message);
    if (chainErr) {
      return chainErr;
    }
    return err.message.substring(0, 80);
  }
  return "";
};
const broadcastPostingJSON = (
  username: string,
  id: string,
  json: {}
): Promise<TransactionConfirmation> => {
  // With posting private key
  const postingKey = getPostingKey(username);
  if (postingKey) {
    const privateKey = PrivateKey.fromString(postingKey);
    const operation: CustomJsonOperation[1] = {
      id,
      required_auths: [],
      required_posting_auths: [username],
      json: JSON.stringify(json),
    };
    return hiveClient.broadcast.json(operation, privateKey);
  }
  // With hivesigner access token

  let token = getAccessToken(username);
  return token
    ? new hs.Client({
        accessToken: token,
      })
        .customJson([], [username], id, JSON.stringify(json))
        .then((r: any) => r.result)
    : Promise.resolve(0);
};
const broadcastPostingOperations = (
  username: string,
  client: Client,
  operations: Operation[]
): Promise<TransactionConfirmation> => {
  // With posting private key
  const postingKey = getPostingKey(username);
  if (postingKey) {
    const privateKey = PrivateKey.fromString(postingKey);
    return hiveClient.broadcast.sendOperations(operations, privateKey);
  }
  // With hivesigner access token
  let token = getAccessToken(username);
  return token
    ? new hs.Client({
        accessToken: token,
      })
        .broadcast(operations)
        .then((r: any) => r.result)
    : Promise.resolve(0);
};
export const reblog = (
  username: string,
  author: string,
  permlink: string,
  _delete: boolean = false
): Promise<TransactionConfirmation> => {
  const message = {
    account: username,
    author,
    permlink,
  };
  if (_delete) {
    message["delete"] = "delete";
  }
  const json = ["reblog", message];
  return broadcastPostingJSON(username, "follow", json).then(
    (r: TransactionConfirmation) => {
      usrActivity(username, 130, r.block_num, r.id).then();
      return r;
    }
  );
};
export const comment = (
  username: string,
  parentAuthor: string,
  parentPermlink: string,
  permlink: string,
  title: string,
  body: string,
  jsonMetadata: MetaData,
  options: CommentOptions | null,
  point: boolean = false
): Promise<TransactionConfirmation> => {
  const params = {
    parent_author: parentAuthor,
    parent_permlink: parentPermlink,
    author: username,
    permlink,
    title,
    body,
    json_metadata: JSON.stringify(jsonMetadata),
  };
  const opArray: Operation[] = [["comment", params]];
  if (options) {
    const e: Operation = ["comment_options", options];
    opArray.push(e);
  }
  return broadcastPostingOperations(username, hiveClient, opArray).then((r) => {
    if (point) {
      const t = title ? 100 : 110;
      usrActivity(username, t, r.block_num, r.id).then();
    }
    return r;
  });
};
export const deleteComment = (
  username: string,
  author: string,
  permlink: string
): Promise<TransactionConfirmation> => {
  const params = {
    author,
    permlink,
  };
  const opArray: Operation[] = [["delete_comment", params]];
  return broadcastPostingOperations(username, hiveClient, opArray);
};
export const vote = (
  username: string,
  author: string,
  permlink: string,
  weight: number
): Promise<TransactionConfirmation> => {
  const params = {
    voter: username,
    author,
    permlink,
    weight,
  };
  const opArray: Operation[] = [["vote", params]];
  return broadcastPostingOperations(username, hiveClient, opArray).then(
    (r: TransactionConfirmation) => {
      usrActivity(username, 120, r.block_num, r.id).then();
      return r;
    }
  );
};
export const follow = (
  follower: string,
  following: string
): Promise<TransactionConfirmation> => {
  const json = [
    "follow",
    {
      follower,
      following,
      what: ["blog"],
    },
  ];
  return broadcastPostingJSON(follower, "follow", json);
};
export const unFollow = (
  follower: string,
  following: string
): Promise<TransactionConfirmation> => {
  const json = [
    "follow",
    {
      follower,
      following,
      what: [],
    },
  ];
  return broadcastPostingJSON(follower, "follow", json);
};
export const ignore = (
  follower: string,
  following: string
): Promise<TransactionConfirmation> => {
  const json = [
    "follow",
    {
      follower,
      following,
      what: ["ignore"],
    },
  ];
  return broadcastPostingJSON(follower, "follow", json);
};
export const claimRewardBalance = (
  username: string,
  rewardHive: string,
  rewardHbd: string,
  rewardVests: string
): Promise<TransactionConfirmation> => {
  const params = {
    account: username,
    reward_hive: rewardHive,
    reward_hbd: rewardHbd,
    reward_vests: rewardVests,
  };
  const opArray: Operation[] = [["claim_reward_balance", params]];
  return broadcastPostingOperations(username, hiveClient, opArray);
};
export const claimRewardBalanceHiveEngineAssetJSON = (
  from: string,
  to: string,
  amount: string
): string => {
  const [quantity, token_name] = amount.split(/ /);
  const json = JSON.stringify({
    symbol: token_name,
  });
  return json;
};
interface ClaimTokenParams {
  id: "scot_claim_token";
  json: string;
  required_auths: [];
  required_posting_auths: [string];
}
export const claimHiveEngineRewardBalance = (
  from: string,
  to: string,
  amount: string
) => {
  const params: ClaimTokenParams = {
    id: "scot_claim_token",
    json: claimRewardBalanceHiveEngineAssetJSON(from, to, amount),
    required_auths: [],
    required_posting_auths: [from],
  };
  const opArray: Operation[] = [["custom_json", params]];
  return broadcastPostingOperations(from, hiveClient, opArray);
};
/*
export const HECustomJSONWithPostingKey = (key: PrivateKey, from:string, json: string): Promise<TransactionConfirmation> => {
    const op = {
        id: 'ssc-mainnet-hive',
        json,
        required_auths: [],
        required_posting_auths: [from]
    };
    return hiveClient.broadcast.json(op, key);
}
export const HECustomJSONPostingKc = (from:string, json: string, description: string): Promise<TxResponse> => {
    return keychain.customJson(from, 'ssc-mainnet-hive', "Posting", json, description);
}
export const HECustomJSONPostingHot = (from:string, json: string, destination: string) => {
    const params = {
        authority: "posting",
        required_auths: `[]`,
        required_posting_auths: `["${from}"]`,
        id: 'ssc-mainnet-hive',
        json,
    }
    hotSign("custom-json", params, destination);
}*/
export const transfer = (
  from: string,
  key: PrivateKey,
  to: string,
  amount: string,
  memo: string
): Promise<TransactionConfirmation> => {
  const args = {
    from,
    to,
    amount,
    memo,
  };
  return hiveClient.broadcast.transfer(args, key);
};
export const transferHot = (
  from: string,
  to: string,
  amount: string,
  memo: string
) => {
  const op: Operation = [
    "transfer",
    {
      from,
      to,
      amount,
      memo,
    },
  ];
  const params: Parameters = {
    callback: document.location.href
  };
  return hs.sendOperation(op, params, () => {});
};
export const transferKc = (
  from: string,
  to: string,
  amount: string,
  memo: string
) => {
  const asset = parseAsset(amount);
  return keychain.transfer(
    from,
    to,
    asset.amount.toString(),
    memo,
    asset.symbol,
    true
  );
};
const transferHiveEngineAssetJSON = (
  from: string,
  to: string,
  amount: string,
  memo: string
): string => {
  const [quantity, token_name] = amount.replace(/,/g, "").split(/ /);
  const json = JSON.stringify({
    // is it always 'tokens'?
    contractName: "tokens",
    contractAction: "transfer",
    contractPayload: {
      symbol: token_name,
      to: to,
      quantity,
      memo: memo,
    },
  });
  return json;
};
export const transferHiveEngineAsset = (
  from: string,
  key: PrivateKey,
  to: string,
  amount: string,
  memo: string
): Promise<TransactionConfirmation> => {
  const json = transferHiveEngineAssetJSON(from, to, amount, memo);
  const op = {
    id: "ssc-mainnet-hive",
    json,
    required_auths: [from],
    required_posting_auths: [],
  };
  return hiveClient.broadcast.json(op, key);
};
export const transferHiveEngineAssetKc = (
  from: string,
  to: string,
  amount: string,
  memo: string
) => {
  const json = transferHiveEngineAssetJSON(from, to, amount, memo);
  const op = {
    id: "ssc-mainnet-hive",
    json,
    required_auths: [from],
    required_posting_auths: [],
  };
  return keychain.customJson(
    from,
    "ssc-mainnet-hive",
    "Active",
    json,
    "Hive Engine Asset Transfer"
  );
};
export const transferHiveEngineAssetHot = (
  from: string,
  to: string,
  amount: string,
  memo: string
) => {
  const json = transferHiveEngineAssetJSON(from, to, amount, memo);
  const params = {
    authority: "active",
    required_auths: `["${from}"]`,
    required_posting_auths: "[]",
    id: "ssc-mainnet-hive",
    json,
  };
  hotSign("custom-json", params, `@${from}/wallet`);
};
export const transferPoint = (
  from: string,
  key: PrivateKey,
  to: string,
  amount: string,
  memo: string
): Promise<TransactionConfirmation> => {
  const json = JSON.stringify({
    sender: from,
    receiver: to,
    amount,
    memo,
  });
  const op = {
    id: "esteem_point_transfer",
    json,
    required_auths: [from],
    required_posting_auths: [],
  };
  return hiveClient.broadcast.json(op, key);
};
export const transferPointHot = (
  from: string,
  to: string,
  amount: string,
  memo: string
) => {
  const params = {
    authority: "active",
    required_auths: `["${from}"]`,
    required_posting_auths: "[]",
    id: "esteem_point_transfer",
    json: JSON.stringify({
      sender: from,
      receiver: to,
      amount,
      memo,
    }),
  };
  hotSign("custom-json", params, `@${from}/points`);
};
export const transferPointKc = (
  from: string,
  to: string,
  amount: string,
  memo: string
) => {
  const json = JSON.stringify({
    sender: from,
    receiver: to,
    amount,
    memo,
  });
  return keychain.customJson(
    from,
    "esteem_point_transfer",
    "Active",
    json,
    "Point Transfer"
  );
};
export const transferToSavings = (
  from: string,
  key: PrivateKey,
  to: string,
  amount: string,
  memo: string
): Promise<TransactionConfirmation> => {
  const op: Operation = [
    "transfer_to_savings",
    {
      from,
      to,
      amount,
      memo,
    },
  ];
  return hiveClient.broadcast.sendOperations([op], key);
};
export const transferToSavingsHot = (
  from: string,
  to: string,
  amount: string,
  memo: string
) => {
  const op: Operation = [
    "transfer_to_savings",
    {
      from,
      to,
      amount,
      memo,
    },
  ];
  const params: Parameters = {
    callback: document.location.href
  };
  return hs.sendOperation(op, params, () => {});
};
export const transferToSavingsKc = (
  from: string,
  to: string,
  amount: string,
  memo: string
) => {
  const op: Operation = [
    "transfer_to_savings",
    {
      from,
      to,
      amount,
      memo,
    },
  ];
  return keychain.broadcast(from, [op], "Active");
};
export const collateralizedConvert = (
  owner: string,
  key: PrivateKey,
  amount: string
): Promise<TransactionConfirmation> => {
  const op: Operation = [
    "collateralized_convert",
    {
      owner,
      amount,
      requestid: new Date().getTime() >>> 0,
    },
  ];
  return hiveClient.broadcast.sendOperations([op], key);
};
export const collateralizedConvertHot = (
  owner: string,
  amount: string
): void => {
  const op: Operation = [
    "collateralized_convert",
    {
      owner,
      amount,
      requestid: new Date().getTime() >>> 0,
    },
  ];
  const params: Parameters = {
    callback: document.location.href
  };
  hs.sendOperation(op, params, () => {});
};
export const collateralizedConvertKc = (owner: string, amount: string) => {
  const op: Operation = [
    "collateralized_convert",
    {
      owner,
      amount,
      requestid: new Date().getTime() >>> 0,
    },
  ];
  return keychain.broadcast(owner, [op], "Active");
};
export const convert = (
  owner: string,
  key: PrivateKey,
  amount: string
): Promise<TransactionConfirmation> => {
  const op: Operation = [
    "convert",
    {
      owner,
      amount,
      requestid: new Date().getTime() >>> 0,
    },
  ];
  return hiveClient.broadcast.sendOperations([op], key);
};
export const convertHot = (owner: string, amount: string) => {
  const op: Operation = [
    "convert",
    {
      owner,
      amount,
      requestid: new Date().getTime() >>> 0,
    },
  ];
  const params: Parameters = {
    callback: document.location.href
  };
  return hs.sendOperation(op, params, () => {});
};
export const convertKc = (owner: string, amount: string) => {
  const op: Operation = [
    "convert",
    {
      owner,
      amount,
      requestid: new Date().getTime() >>> 0,
    },
  ];
  return keychain.broadcast(owner, [op], "Active");
};
export const transferFromSavings = (
  from: string,
  key: PrivateKey,
  to: string,
  amount: string,
  memo: string
): Promise<TransactionConfirmation> => {
  const op: Operation = [
    "transfer_from_savings",
    {
      from,
      to,
      amount,
      memo,
      request_id: new Date().getTime() >>> 0,
    },
  ];
  return hiveClient.broadcast.sendOperations([op], key);
};
export const transferFromSavingsHot = (
  from: string,
  to: string,
  amount: string,
  memo: string
) => {
  const op: Operation = [
    "transfer_from_savings",
    {
      from,
      to,
      amount,
      memo,
      request_id: new Date().getTime() >>> 0,
    },
  ];
  const params: Parameters = {
    callback: document.location.href
  };
  return hs.sendOperation(op, params, () => {});
};
export const transferFromSavingsKc = (
  from: string,
  to: string,
  amount: string,
  memo: string
) => {
  const op: Operation = [
    "transfer_from_savings",
    {
      from,
      to,
      amount,
      memo,
      request_id: new Date().getTime() >>> 0,
    },
  ];
  return keychain.broadcast(from, [op], "Active");
};
export const createTransferToVestingOp = (
  from: string,
  to: string,
  amount: string
): Operation => {
  const parts = amount.split(/ /);
  const currency = parts[parts.length - 1];
  const quantity = parts[0].replace(/,/g, "");
  console.log(from, to, amount);
  if (currency === HIVE_API_NAME) {
    return [
      "transfer_to_vesting",
      {
        from,
        to,
        amount,
      },
    ];
  } else {
    return [
      "custom_json",
      {
        id: "ssc-mainnet-hive",
        required_auths: [from],
        required_posting_auths: [],
        json: JSON.stringify({
          contractName: "tokens",
          contractAction: "stake",
          contractPayload: {
            symbol: currency,
            to: to,
            quantity: quantity,
          },
        }),
      },
    ];
  }
};
export const transferToVesting = (
  from: string,
  key: PrivateKey,
  to: string,
  amount: string
): Promise<TransactionConfirmation> => {
  return hiveClient.broadcast.sendOperations(
    [createTransferToVestingOp(from, to, amount)],
    key
  );
};
export const transferToVestingHot = (
  from: string,
  to: string,
  amount: string
) => {
  console.log(from, to, amount);
  const params: Parameters = {
    callback: document.location.href,
  };
  const op: Operation = createTransferToVestingOp(from, to, amount);
  return hs.sendOperation(op, params, () => {});
};
export const transferToVestingKc = (
  from: string,
  to: string,
  amount: string
) => {
  return keychain.broadcast(
    from,
    [createTransferToVestingOp(from, to, amount)],
    "Active"
  );
};
export const createDelegateVestingSharesOp = (
  delegator: string,
  delegatee: string,
  vestingShares: string
): Operation => {
  if (!/[0-9]+(.[0-9]+)? [A-Z][A-Z0-9]+/.test(vestingShares)) {
    throw new Error(
      `Invalid vestingShares Amount specified: "${vestingShares}"`
    );
  }
  const parts = vestingShares.split(/ /);
  const currency = parts[parts.length - 1];
  const quantity = parts[0].replace(/,/g, "");
  if (currency === "VESTS") {
    return [
      "delegate_vesting_shares",
      {
        delegator,
        delegatee,
        vesting_shares: vestingShares,
      },
    ];
  } else {
    return [
      "custom_json",
      {
        id: "ssc-mainnet-hive",
        required_auths: [delegator],
        required_posting_auths: [],
        json: JSON.stringify({
          contractName: "tokens",
          contractAction: "delegate",
          contractPayload: {
            symbol: currency,
            to: delegatee,
            quantity: quantity,
          },
        }),
      },
    ];
  }
};

export const delegateVestingShares = (
  delegator: string,
  key: PrivateKey,
  delegatee: string,
  vestingShares: string
): Promise<TransactionConfirmation> => {
  const op: Operation = createDelegateVestingSharesOp(
    delegator,
    delegatee,
    vestingShares
  );
  return hiveClient.broadcast.sendOperations([op], key);
};

export const delegateVestingSharesHot = (
  delegator: string,
  delegatee: string,
  vestingShares: string
) => {
  const op: Operation = createDelegateVestingSharesOp(
    delegator,
    delegatee,
    vestingShares
  );
  const parts = vestingShares.split(/ /);
  const currency = parts[parts.length - 1];
  const quantity = parts[0].replace(/,/g, "");
  const params: Parameters = {
    callback: document.location.href
  };
  return hs.sendOperation(op, params, console.log);
};
export const delegateVestingSharesKc = (
  delegator: string,
  delegatee: string,
  vestingShares: string
) => {
  const op: Operation = createDelegateVestingSharesOp(
    delegator,
    delegatee,
    vestingShares
  );
  return keychain.broadcast(delegator, [op], "Active");
};

export const undelegateHiveEngineStakedAssetJSON = (
  delegator: string,
  delegatee: string,
  quantity: string,
  currency: string
) => {
  const json = JSON.stringify({
    // is it always 'tokens'?
    contractName: "tokens",
    contractAction: "undelegate",
    contractPayload: {
      symbol: currency,
      from: delegatee,
      quantity,
    },
  });
  return json;
};

export const createUndelegateVestingSharesOp = (
  delegator: string,
  delegatee: string,
  quantity: string,
  currency: string
): Operation => {
  quantity = quantity.replace(/,/g, "");
  if (currency === "VESTS") {
    return [
      "delegate_vesting_shares",
      {
        delegator,
        delegatee,
        vesting_shares: quantity,
      },
    ];
  } else {
    const json = undelegateHiveEngineStakedAssetJSON(
      delegator,
      delegatee,
      quantity,
      currency
    );
    return [
      "custom_json",
      {
        id: "ssc-mainnet-hive",
        required_auths: [delegator],
        required_posting_auths: [],
        json,
      },
    ];
  }
};

export const undelegateVestingShares = (
  delegator: string,
  key: PrivateKey,
  delegatee: string,
  quantity: string,
  currency: string
): Promise<TransactionConfirmation> => {
  const op: Operation = createUndelegateVestingSharesOp(
    delegator,
    delegatee,
    quantity,
    currency
  );
  return hiveClient.broadcast.sendOperations([op], key);
};

export const undelegateVestingSharesHot = (
  delegator: string,
  delegatee: string,
  quantity: string,
  currency: string
) => {
  const op: Operation = createUndelegateVestingSharesOp(
    delegator,
    delegatee,
    quantity,
    currency
  );
  const params: Parameters = {
    callback: document.location.href
  };
  return hs.sendOperation(op, params, () => {});
};

export const undelegateVestingSharesKc = (
  delegator: string,
  delegatee: string,
  quantity: string,
  currency: string
) => {
  const op: Operation = createUndelegateVestingSharesOp(
    delegator,
    delegatee,
    quantity,
    currency
  );
  return keychain.broadcast(delegator, [op], "Active");
};

export const createStopWithdrawVestingOp = (
  account: string,
  txId: string
): Operation => {
  return [
    "custom_json",
    {
      id: "ssc-mainnet-hive",
      required_auths: [account],
      required_posting_auths: [],
      json: JSON.stringify({
        contractName: "tokens",
        contractAction: "cancelUnstake",
        contractPayload: {
          txID: txId,
        },
      }),
    },
  ];
};
export const createWithdrawVestingOp = (
  account: string,
  quantity: string,
  currency: string
): Operation => {
  if (currency === "VESTS") {
    return [
      "withdraw_vesting",
      {
        account,
        vesting_shares: quantity,
      },
    ];
  } else {
    return [
      "custom_json",
      {
        id: "ssc-mainnet-hive",
        required_auths: [account],
        required_posting_auths: [],
        json: JSON.stringify({
          contractName: "tokens",
          contractAction: "unstake",
          contractPayload: {
            symbol: currency,
            to: account,
            quantity: quantity,
          },
        }),
      },
    ];
  }
};
export const withdrawVesting = (
  account: string,
  key: PrivateKey,
  vestingShares: string,
  symbol: string
): Promise<TransactionConfirmation> => {
  const op: Operation = createWithdrawVestingOp(account, vestingShares, symbol);
  return hiveClient.broadcast.sendOperations([op], key);
};
export const withdrawVestingHot = (
  account: string,
  vestingShares: string,
  symbol: string,
  fn: () => void
) => {
  const op: Operation = createWithdrawVestingOp(account, vestingShares, symbol);
  const params: Parameters = {
    callback: document.location.href
  };
  return hs.sendOperation(op, params, fn);
};
export const withdrawVestingKc = (
  account: string,
  vestingShares: string,
  symbol: string
) => {
  const op: Operation = createWithdrawVestingOp(account, vestingShares, symbol);
  return keychain.broadcast(account, [op], "Active");
};
export const createCancelPowerDownOp = (
  account: string,
  txID: string
): Operation => {
  return [
    "custom_json",
    {
      id: "ssc-mainnet-hive",
      required_auths: ["leprechaun"],
      required_posting_auths: [],
      json: JSON.stringify({
        contractName: "tokens",
        contractAction: "cancelUnstake",
        contractPayload: {
          txID: txID,
        },
      }),
    },
  ];
};
export const cancelWithdrawVesting = (
  account: string,
  key: PrivateKey,
  txID: string
): Promise<TransactionConfirmation> => {
  const op: Operation = createCancelPowerDownOp(account, txID);
  return hiveClient.broadcast.sendOperations([op], key);
};
export const cancelWithdrawVestingHot = (account: string, txID: string) => {
  const op: Operation = createCancelPowerDownOp(account, txID);
  const params: Parameters = {
    callback: document.location.href
  };
  hs.sendOperation(op, params, () => {});
};
export const cancelWithdrawVestingKc = (account: string, txID: string) => {
  const op: Operation = createCancelPowerDownOp(account, txID);
  return keychain.broadcast(account, [op], "Active");
};
export const setWithdrawVestingRoute = (
  from: string,
  key: PrivateKey,
  to: string,
  percent: number,
  autoVest: boolean
): Promise<TransactionConfirmation> => {
  const op: Operation = [
    "set_withdraw_vesting_route",
    {
      from_account: from,
      to_account: to,
      percent,
      auto_vest: autoVest,
    },
  ];
  return hiveClient.broadcast.sendOperations([op], key);
};
export const setWithdrawVestingRouteHot = (
  from: string,
  to: string,
  percent: number,
  autoVest: boolean
) => {
  const op: Operation = [
    "set_withdraw_vesting_route",
    {
      from_account: from,
      to_account: to,
      percent,
      auto_vest: autoVest,
    },
  ];
  const params: Parameters = {
    callback: document.location.href
  };
  return hs.sendOperation(op, params, () => {});
};
export const setWithdrawVestingRouteKc = (
  from: string,
  to: string,
  percent: number,
  autoVest: boolean
) => {
  const op: Operation = [
    "set_withdraw_vesting_route",
    {
      from_account: from,
      to_account: to,
      percent,
      auto_vest: autoVest,
    },
  ];
  return keychain.broadcast(from, [op], "Active");
};
export const witnessVote = (
  account: string,
  key: PrivateKey,
  witness: string,
  approve: boolean
): Promise<TransactionConfirmation> => {
  const op: Operation = [
    "account_witness_vote",
    {
      account,
      witness,
      approve,
    },
  ];
  return hiveClient.broadcast.sendOperations([op], key);
};
export const witnessVoteHot = (
  account: string,
  witness: string,
  approve: boolean
) => {
  const params = {
    account,
    witness,
    approve,
  };
  hotSign("account-witness-vote", params, "witnesses");
};
export const witnessVoteKc = (
  account: string,
  witness: string,
  approve: boolean
) => {
  return keychain.witnessVote(account, witness, approve);
};
export const witnessProxy = (
  account: string,
  key: PrivateKey,
  proxy: string
): Promise<TransactionConfirmation> => {
  const op: Operation = [
    "account_witness_proxy",
    {
      account,
      proxy,
    },
  ];
  return hiveClient.broadcast.sendOperations([op], key);
};
export const witnessProxyHot = (account: string, proxy: string) => {
  const params = {
    account,
    proxy,
  };
  hotSign("account-witness-proxy", params, "witnesses");
};
export const witnessProxyKc = (account: string, witness: string) => {
  return keychain.witnessProxy(account, witness);
};
export const proposalVote = (
  account: string,
  key: PrivateKey,
  proposal: number,
  approve: boolean
): Promise<TransactionConfirmation> => {
  const op: Operation = [
    "update_proposal_votes",
    {
      voter: account,
      proposal_ids: [proposal],
      approve,
      extensions: [],
    },
  ];
  return hiveClient.broadcast.sendOperations([op], key);
};
export const proposalVoteHot = (
  account: string,
  proposal: number,
  approve: boolean
) => {
  const params = {
    account,
    proposal_ids: JSON.stringify([proposal]),
    approve,
  };
  hotSign("update-proposal-votes", params, "proposals");
};
export const proposalVoteKc = (
  account: string,
  proposal: number,
  approve: boolean
) => {
  const op: Operation = [
    "update_proposal_votes",
    {
      voter: account,
      proposal_ids: [proposal],
      approve,
      extensions: [],
    },
  ];
  return keychain.broadcast(account, [op], "Active");
};
export const subscribe = (
  username: string,
  community: string
): Promise<TransactionConfirmation> => {
  const json = ["subscribe", { community }];
  return broadcastPostingJSON(username, "community", json);
};
export const unSubscribe = (
  username: string,
  community: string
): Promise<TransactionConfirmation> => {
  const json = ["unsubscribe", { community }];
  return broadcastPostingJSON(username, "community", json);
};
export const promote = (
  key: PrivateKey,
  user: string,
  author: string,
  permlink: string,
  duration: number
): Promise<TransactionConfirmation> => {
  const json = JSON.stringify({
    user,
    author,
    permlink,
    duration,
  });
  const op = {
    id: "esteem_promote",
    json,
    required_auths: [user],
    required_posting_auths: [],
  };
  return hiveClient.broadcast.json(op, key);
};
export const promoteHot = (
  user: string,
  author: string,
  permlink: string,
  duration: number
) => {
  const params = {
    authority: "active",
    required_auths: `["${user}"]`,
    required_posting_auths: "[]",
    id: "esteem_promote",
    json: JSON.stringify({
      user,
      author,
      permlink,
      duration,
    }),
  };
  hotSign("custom-json", params, `@${user}/points`);
};
export const promoteKc = (
  user: string,
  author: string,
  permlink: string,
  duration: number
) => {
  const json = JSON.stringify({
    user,
    author,
    permlink,
    duration,
  });
  return keychain.customJson(user, "esteem_promote", "Active", json, "Promote");
};
export const boost = (
  key: PrivateKey,
  user: string,
  author: string,
  permlink: string,
  amount: string
): Promise<TransactionConfirmation> => {
  const json = JSON.stringify({
    user,
    author,
    permlink,
    amount,
  });
  const op = {
    id: "esteem_boost",
    json,
    required_auths: [user],
    required_posting_auths: [],
  };
  return hiveClient.broadcast.json(op, key);
};
export const boostHot = (
  user: string,
  author: string,
  permlink: string,
  amount: string
) => {
  const params = {
    authority: "active",
    required_auths: `["${user}"]`,
    required_posting_auths: "[]",
    id: "esteem_boost",
    json: JSON.stringify({
      user,
      author,
      permlink,
      amount,
    }),
  };
  hotSign("custom-json", params, `@${user}/points`);
};
export const boostKc = (
  user: string,
  author: string,
  permlink: string,
  amount: string
) => {
  const json = JSON.stringify({
    user,
    author,
    permlink,
    amount,
  });
  return keychain.customJson(user, "esteem_boost", "Active", json, "Boost");
};
export const communityRewardsRegister = (
  key: PrivateKey,
  name: string
): Promise<TransactionConfirmation> => {
  const json = JSON.stringify({
    name,
  });
  const op = {
    id: "esteem_registration",
    json,
    required_auths: [name],
    required_posting_auths: [],
  };
  return hiveClient.broadcast.json(op, key);
};
export const communityRewardsRegisterHot = (name: string) => {
  const params = {
    authority: "active",
    required_auths: `["${name}"]`,
    required_posting_auths: "[]",
    id: "esteem_registration",
    json: JSON.stringify({
      name,
    }),
  };
  hotSign("custom-json", params, `created/${name}`);
};
export const communityRewardsRegisterKc = (name: string) => {
  const json = JSON.stringify({
    name,
  });
  return keychain.customJson(
    name,
    "esteem_registration",
    "Active",
    json,
    "Community Registration"
  );
};
export const updateProfile = (
  account: Account,
  newProfile: {
    name: string;
    about: string;
    website: string;
    location: string;
    cover_image: string;
    profile_image: string;
  }
): Promise<TransactionConfirmation> => {
  const params = {
    account: account.name,
    json_metadata: "",
    posting_json_metadata: JSON.stringify({
      profile: { ...newProfile, version: 2 },
    }),
    extensions: [],
  };
  const opArray: Operation[] = [["account_update2", params]];
  return broadcastPostingOperations(account.name, hiveClient, opArray);
};
export const grantPostingPermission = (
  key: PrivateKey,
  account: Account,
  pAccount: string
) => {
  if (!account.__loaded) {
    throw "posting|memo_key|json_metadata required with account instance";
  }
  const newPosting = Object.assign(
    {},
    { ...account.posting },
    {
      account_auths: [
        ...account.posting.account_auths,
        [pAccount, account.posting.weight_threshold],
      ],
    }
  );
  // important!
  newPosting.account_auths.sort((a, b) => (a[0] > b[0] ? 1 : -1));
  return hiveClient.broadcast.updateAccount(
    {
      account: account.name,
      posting: newPosting,
      active: undefined,
      memo_key: account.memo_key,
      json_metadata: account.json_metadata,
    },
    key
  );
};
export const revokePostingPermission = (
  key: PrivateKey,
  account: Account,
  pAccount: string
) => {
  if (!account.__loaded) {
    throw "posting|memo_key|json_metadata required with account instance";
  }
  const newPosting = Object.assign(
    {},
    { ...account.posting },
    {
      account_auths: account.posting.account_auths.filter(
        (x) => x[0] !== pAccount
      ),
    }
  );
  return hiveClient.broadcast.updateAccount(
    {
      account: account.name,
      posting: newPosting,
      memo_key: account.memo_key,
      json_metadata: account.json_metadata,
    },
    key
  );
};
export const setUserRole = (
  username: string,
  community: string,
  account: string,
  role: string
): Promise<TransactionConfirmation> => {
  const json = ["setRole", { community, account, role }];
  return broadcastPostingJSON(username, "community", json);
};
export const updateCommunity = (
  username: string,
  community: string,
  props: {
    title: string;
    about: string;
    lang: string;
    description: string;
    flag_text: string;
    is_nsfw: boolean;
  }
): Promise<TransactionConfirmation> => {
  const json = ["updateProps", { community, props }];
  return broadcastPostingJSON(username, "community", json);
};
export const pinPost = (
  username: string,
  community: string,
  account: string,
  permlink: string,
  pin: boolean
): Promise<TransactionConfirmation> => {
  const json = [
    pin ? "pinPost" : "unpinPost",
    { community, account, permlink },
  ];
  return broadcastPostingJSON(username, "community", json);
};
export const hiveNotifySetLastRead = (
  username: string
): Promise<TransactionConfirmation> => {
  const now = new Date().toISOString();
  const date = now.split(".")[0];
  const json = ["setLastRead", { date }];
  return broadcastPostingJSON(username, "notify", json);
};
export const mutePost = (
  username: string,
  community: string,
  account: string,
  permlink: string,
  notes: string,
  mute: boolean
): Promise<TransactionConfirmation> => {
  const json = [
    mute ? "mutePost" : "unmutePost",
    { community, account, permlink, notes },
  ];
  return broadcastPostingJSON(username, "community", json);
};
export const updatePassword = (
  update: AccountUpdateOperation[1],
  ownerKey: PrivateKey
): Promise<TransactionConfirmation> =>
  hiveClient.broadcast.updateAccount(update, ownerKey);
