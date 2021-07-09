interface BaseTransaction {
    num: number;
    type: string;
    timestamp: string;
    trx_id: string
}

export interface CollateralizedConvert extends BaseTransaction {
	type: 'collateralized_convert';
	owner: string;
	amount: string;
	requestid: number;
};

export interface CurationReward extends BaseTransaction {
    type: "curation_reward";
    comment_author: string;
    comment_permlink: string;
    curator: string;
    reward: string;
}

export interface AuthorReward extends BaseTransaction {
    type: "author_reward";
    author: string;
    permlink: string;
    hbd_payout: string;
    hive_payout: string;
    vesting_payout: string;
}

export interface CommentBenefactor extends BaseTransaction {
    type: "comment_benefactor_reward";
    benefactor: string;
    author: string;
    permlink: string;
    hbd_payout: string;
    hive_payout: string;
    vesting_payout: string;
}

export interface ClaimRewardBalance extends BaseTransaction {
    type: "claim_reward_balance";
    account: string;
    reward_hbd: string;
    reward_hive: string;
    reward_vests: string;
}

export interface Transfer extends BaseTransaction {
    type: "transfer";
    amount: string;
    memo: string;
    from: string;
    to: string;
}

export interface HEFineTransaction {
    account    : string;
    author    : string;
    id    : number;
    // in satoshis
    int_amount    : number;
    permlink    : string;
    // For POB always 8
    precision    : number;
    // Iso string date
    timestamp    : string;
    // POB
    token    : string;
    trx    :  string| null;
    type    : string;
}


export interface HEAuthorReward extends HEFineTransaction {
    trx    : null;
    type    : "author_reward";
}

export interface HECurationReward extends HEFineTransaction {
    curator : string;
    trx: null;
    type: "curation_reward";
}


export interface HECoarseTransaction {
    _id: string;
    blockNumber: number;
    "transactionId":string;
    // seconds since 1970
    "timestamp":number;
    "account":string;
    "operation":string;
    "from":string;
    "to":string;
    // POB for Proof of Brain
    "symbol":string;
    // quantity is NOT in satoshis.
    "quantity":string;
    "memo": null|string;
}

export interface TransferToVesting extends BaseTransaction {
    type: "transfer_to_vesting";
    amount: string;
    memo?: string;
    from: string;
    to: string;
}

export interface TransferToSavings extends BaseTransaction {
    type: "transfer_to_savings";
    amount: string;
    memo?: string;
    from: string;
    to: string;
}

export interface CancelTransferFromSavings extends BaseTransaction {
    from: string,
    request_id: number,
    type: "cancel_transfer_from_savings",
}

export interface WithdrawVesting extends BaseTransaction {
    type: "withdraw_vesting";
    acc: string;
    vesting_shares: string;
}

export interface FillOrder extends BaseTransaction {
    type: "fill_order";
    current_pays: string;
    open_pays: string;
}

export interface ProducerReward extends BaseTransaction {
    type: "producer_reward";
    vesting_shares: string;
    producer: string
}

export interface Interest extends BaseTransaction {
    type: "interest";
    owner: string;
    interest: string
}

export interface FillConvertRequest extends BaseTransaction {
    type: "fill_convert_request",
    amount_in: string,
    amount_out: string,
}

export interface ReturnVestingDelegation extends BaseTransaction {
    type: "return_vesting_delegation"
    vesting_shares: string
}

export interface ProposalPay extends BaseTransaction {
    type: "proposal_pay"
    payment: string
}

export type Transaction =
    | CurationReward
    | AuthorReward
    | CommentBenefactor
    | ClaimRewardBalance
    | Transfer
    | TransferToVesting
    | TransferToSavings
    | CancelTransferFromSavings
    | WithdrawVesting
    | FillOrder
    | ProducerReward
    | Interest
    | FillConvertRequest
    | ReturnVestingDelegation
    | ProposalPay
    | CollateralizedConvert;

export type OperationGroup = "transfers" | "market-orders" | "interests" | "stake-operations" | "rewards";

export interface Transactions {
    list: Transaction[];
    loading: boolean;
    group: OperationGroup | ""
}

export enum ActionTypes {
    FETCH = "@transactions/FETCH",
    FETCHED = "@transactions/FETCHED",
    FETCH_ERROR = "@transactions/FETCH_ERROR",
    RESET = "@transactions/RESET",
}

export interface FetchAction {
    type: ActionTypes.FETCH;
    group: OperationGroup | "";
}

export interface FetchedAction {
    type: ActionTypes.FETCHED;
    transactions: Transaction[];
}

export interface FetchErrorAction {
    type: ActionTypes.FETCH_ERROR;
}

export interface ResetAction {
    type: ActionTypes.RESET;
}

export type Actions = FetchAction | FetchedAction | FetchErrorAction | ResetAction;
