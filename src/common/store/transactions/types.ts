import { SMTAsset } from "@hiveio/dhive";
export type nAACRS = string; // number as a computer readable string:  No commas.  No units.
export type nAAHRS = string; // number as a computer readable string:  Commas, but no units.
export type aAAS = string; // amount as a string: commas and units.
export type orderTypeType = "buy" | "sell" | "marketSell" | "marketBuy";
export function validateOrderType(s: string) {
  if (!["buy", "sell", "marketSell", "marketBuy"].includes(s))
    throw new Error("Unexpected orderType value:" + JSON.stringify(s));
}
interface BaseTransaction {
  num: number;
  type: string;
  timestamp: string;
  trx_id: string;
}
export interface HEBaseFineTransaction {
  account: string;
  author: string;
  id: number;
  // in satoshis
  int_amount: number;
  permlink: string;
  // For POB always 8
  precision: number;
  // Iso string date
  timestamp: string;
  // POB
  token: string;
  trx: string | null;
  type: string;
}
export interface HECoarseBaseTransaction {
  _id: string;
  blockNumber: number;
  transactionId: string;
  // seconds since 1970
  timestamp: number;
  operation: string;
  // POB for Proof of Brain
  symbol: string;
}
export interface CollateralizedConvert extends BaseTransaction {
  type: "collateralized_convert";
  owner: string;
  amount: string;
  requestid: number;
}
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
  he_payout?: string;
  hbd_payout: string;
  hive_payout: string;
  vesting_payout: string;
}
export interface CommentBenefactor extends BaseTransaction {
  type: "comment_benefactor_reward";
  benefactor: string;
  author: string;
  permlink: string;
  he_payout?: string;
  hbd_payout: string;
  hive_payout: string;
  vesting_payout: string;
}
export interface ClaimRewardBalance extends BaseTransaction {
  type: "claim_reward_balance";
  account: string;
  reward_he?: string;
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
// This is only available as HE (tokens_issue)
export interface TokensIssue extends BaseTransaction {
  type: "tokens_issue";
  to: string;
  amount: string;
}
export interface TransferToVesting extends BaseTransaction {
  type: "transfer_to_vesting";
  amount: string | aAAS;
  memo?: string;
  from: string;
  to: string;
}
export interface HETokensStake extends HECoarseBaseTransaction {
  operation: "tokens_stake";
  account: string;
  from: string;
  to: string;
  quantity: nAACRS;
}
export interface TransferToSavings extends BaseTransaction {
  type: "transfer_to_savings";
  amount: string;
  memo?: string;
  from: string;
  to: string;
}
export interface CancelTransferFromSavings extends BaseTransaction {
  from: string;
  request_id: number;
  type: "cancel_transfer_from_savings";
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
  producer: string;
}
export interface Interest extends BaseTransaction {
  type: "interest";
  owner: string;
  interest: string;
}
export interface FillConvertRequest extends BaseTransaction {
  type: "fill_convert_request";
  amount_in: string;
  amount_out: string;
}
export interface ReturnVestingDelegation extends BaseTransaction {
  type: "return_vesting_delegation";
  vesting_shares: string;
}
export interface ProposalPay extends BaseTransaction {
  type: "proposal_pay";
  payment: string;
}
export interface MarketSell extends BaseTransaction {
  type: "market_sell";
  account: string;
  to: string;
  base: aAAS;
  quote: aAAS;
}
export interface HEMarketSell extends HECoarseBaseTransaction {
  operation: "market_sell";
  quantitySteem: nAACRS;
  quantityTokens: nAACRS;
  account: string;
  to: string;
}
export interface HEAuthorReward extends HEBaseFineTransaction {
  trx: null;
  type: "author_reward";
}
export interface HECurationReward extends HEBaseFineTransaction {
  curator: string;
  trx: null;
  type: "curation_reward";
}
export type HEFineTransaction = HECurationReward | HEAuthorReward;
export interface HETokensIssue extends HECoarseBaseTransaction {
  operation: "tokens_issue";
  to: string;
  quantity: nAACRS;
}
export interface HEUnstakeStart extends HECoarseBaseTransaction {
  operation: "tokens_unstakeStart";
  account: string;
  quantity: string;
}
export interface UnstakeStart extends BaseTransaction {
  type: "tokens_unstakeStart";
  account: string;
  amount: aAAS;
}
export interface HETokensTransfer extends HECoarseBaseTransaction {
  operation: "tokens_transfer";
  from: string;
  to: string;
  quantity: nAACRS;
  memo: string;
}
export interface HETokensCancelUnstake extends HECoarseBaseTransaction {
  operation: "tokens_CancelUnstake";
  unstakeTxID: string;
  quantityReturned: nAACRS;
}
export interface HEMarketPlaceOrder extends HECoarseBaseTransaction {
  operation: "market_placeOrder";
  account: string;
  orderType: orderTypeType;
  price: null | nAACRS; // bare number
  quantityLocked: nAACRS; // bare number
}
export interface MarketPlaceOrder extends BaseTransaction {
  type: "market_placeOrder";
  account: string;
  orderType: orderTypeType;
  price: null | aAAS; // number with units
  quantityLocked: aAAS; // number with units
}
export interface HEMarketCancel extends HECoarseBaseTransaction {
  operation: "market_cancel";
  orderId: string;
  orderType: orderTypeType;
  account: string;
  quantityReturned: string;
  symbol: string;
}
export interface MarketCancel extends BaseTransaction {
  type: "market_cancel";
  orderId: string;
  account: string;
  orderType: orderTypeType;
  amount: aAAS;
}
export interface HETokensUndelegateDone extends HECoarseBaseTransaction {
  operation: "tokens_undelegateDone";
  quantity: string;
}
export interface HETokensDelegate extends HECoarseBaseTransaction {
  operation: "tokens_delegate";
  account: string;
  quantity: nAACRS;
  to: string;
  symbol: string;
}
export interface TokensDelegate extends BaseTransaction {
  type: "tokens_delegate";
  account: string;
  amount: aAAS;
  to: string;
}
export interface HETokensUndelegateDone extends HECoarseBaseTransaction {
  operation: "tokens_undelegateDone";
  account: string;
}
export interface TokensUndelegateDone extends BaseTransaction {
  type: "tokens_undelegateDone";
  account: string;
}
export interface HEMarketBuy extends HECoarseBaseTransaction {
  operation: "market_buy";
  account: string;
  from: string;
  quantitySteem: nAACRS;
  quantityTokens: nAACRS;
  symbol: string;
}
export interface MarketBuy extends BaseTransaction {
  type: "market_buy";
  account: string;
  from: string;
  base: aAAS;
  quote: aAAS;
}
export interface HETokensUndelegateStart extends HECoarseBaseTransaction {
  operation: "tokens_undelegateStart";
  account: string;
  from: string;
  quantity: string;
  symbol: string;
}
export interface TokensUndelegateStart extends BaseTransaction {
  type: "tokens_undelegateStart";
  account: string;
  from: string;
  amount: aAAS;
}
export interface HECancelUnstake {
  _id: string;
  blockNumber: number;
  transactionId: string;
  timestamp: number;
  account: string;
  operation: "tokens_cancelUnstake";
  unstakeTxID: string;
  symbol: string;
  quantityReturned: nAACRS;
}
export interface CancelUnstake extends BaseTransaction {
  type: "tokens_CancelUnstake";
  amount: aAAS;
  unstakeTxID: string;
}
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
  from: string;
  request_id: number;
  type: "cancel_transfer_from_savings";
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
  producer: string;
}
export interface Interest extends BaseTransaction {
  type: "interest";
  owner: string;
  interest: string;
}
export interface FillConvertRequest extends BaseTransaction {
  type: "fill_convert_request";
  amount_in: string;
  amount_out: string;
}
export interface ProposalPay extends BaseTransaction {
  type: "proposal_pay";
  payment: string;
}
export interface CommentPayoutUpdate extends BaseTransaction {
  type: "comment_payout_update";
  author: string;
  permlink: string;
}
export interface CommentReward extends BaseTransaction {
  type: "comment_reward";
  author: string;
  permlink: string;
  payout: string;
}
export interface CollateralizedConvert extends BaseTransaction {
  type: "collateralized_convert";
  owner: string;
  requestid: number;
  amount: string;
}
export interface RecurrentTransfers extends BaseTransaction {
  type: "recurrent_transfer";
  amount: string;
  memo: string;
  from: string;
  to: string;
  recurrence: number;
  executions: number;
}
export interface FillRecurrentTransfers extends BaseTransaction {
  type: "fill_recurrent_transfer";
  amount: SMTAsset;
  memo: string;
  from: string;
  to: string;
  remaining_executions: number;
}
export interface LimitOrderCreate extends BaseTransaction {
  type: "limit_order_create";
  owner: string;
  orderid: number;
  amount_to_sell: string;
  min_to_receive: string;
  expiration: string;
}
export interface FillVestingWithdraw extends BaseTransaction {
  type: "fill_vesting_withdraw";
  from_account: string;
  to_account: string;
  withdrawn: string;
  deposited: string;
}
export interface EffectiveCommentVote extends BaseTransaction {
  type: "effective_comment_vote";
  voter: string;
  author: string;
  permlink: string;
  pending_payout: string;
  total_vote_weight: number;
  rshares: number;
  weight: number;
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
  | MarketBuy
  | CommentReward
  | CommentPayoutUpdate
  | TokensDelegate
  | TokensUndelegateDone
  | TokensUndelegateStart
  | MarketCancel
  | MarketPlaceOrder
  | CancelUnstake
  | UnstakeStart
  | MarketSell
  | TokensIssue
  | CollateralizedConvert
  | RecurrentTransfers
  | FillRecurrentTransfers
  | LimitOrderCreate
  | FillVestingWithdraw
  | EffectiveCommentVote;
export type OperationGroup =
  | "transfers"
  | "market-orders"
  | "interests"
  | "stake-operations"
  | "rewards";
export interface Transactions {
  list: Transaction[];
  loading: boolean;
  group: OperationGroup | "";
}
export type HECoarseTransaction =
  | HETokensIssue
  | HEUnstakeStart
  | HETokensTransfer
  | HETokensCancelUnstake
  | HEMarketSell
  | HEMarketBuy
  | HEMarketPlaceOrder
  | HEMarketCancel
  | HETokensUndelegateDone
  | HETokensDelegate
  | HETokensUndelegateDone
  | HEMarketBuy
  | HEMarketPlaceOrder
  | HETokensUndelegateStart
  | HETokensStake
  | HECancelUnstake
  | HEMarketCancel;
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
export type Actions =
  | FetchAction
  | FetchedAction
  | FetchErrorAction
  | ResetAction;
