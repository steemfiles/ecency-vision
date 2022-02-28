import React, { Component } from "react";
import moment from "moment";
import { History } from "history";
import { FormControl } from "react-bootstrap";
import { DynamicProps } from "../../store/dynamic-props/types";
import { Link } from "react-router-dom";
import {
  OperationGroup,
  Transaction,
  Transactions,
} from "../../store/transactions/types";
import { Account } from "../../store/accounts/types";
import LinearProgress from "../linear-progress";
import EntryLink from "../entry-link";
import parseAsset from "../../helper/parse-asset";
import parseDate from "../../helper/parse-date";
import { vestsToHp } from "../../helper/vesting";
import formattedNumber from "../../util/formatted-number";
import {
  arrowLeftSvg,
  arrowRightSvg,
  cashCoinSvg,
  cashMultiple,
  cashSvg,
  closeSvg,
  commentSvg,
  compareHorizontalSvg,
  exchangeSvg,
  gridSvg,
  pickAxeSvg,
  powerDownSvg,
  powerUpSvg,
  reOrderHorizontalSvg,
  starsSvg,
  ticketSvg,
} from "../../img/svg";
import { _t } from "../../i18n";
import { Tsx } from "../../i18n/helper";
import { HIVE_API_NAME, DOLLAR_API_NAME } from "../../api/hive";
const HIVE_HUMAN_NAME = "Hive";
const DOLLAR_HUMAN_NAME = "HBD";
interface RowProps {
  history: History;
  dynamicProps: DynamicProps;
  transaction: Transaction;
}
export class TransactionRow extends Component<RowProps> {
  render() {
    const { dynamicProps, transaction: tr } = this.props;
    const { hivePerMVests } = dynamicProps;
    let flag = false;
    let icon = ticketSvg;
    let numbers = null;
    let details = null;
    if (tr.type === "curation_reward") {
      flag = true;
      icon = cashCoinSvg;
      const reward = parseAsset(tr.reward);
      if (reward.symbol === "VESTS")
        numbers = (
          <>
            {formattedNumber(
              vestsToHp(parseAsset(tr.reward).amount, hivePerMVests),
              { suffix: "HP" }
            )}
          </>
        );
      else numbers = <> {tr.reward}</>;
      details = EntryLink({
        ...this.props,
        entry: {
          category: "ecency",
          author: tr.comment_author,
          permlink: tr.comment_permlink,
        },
        children: (
          <span>
            {"@"}
            {tr.comment_author}/ {tr.comment_permlink}
          </span>
        ),
      });
    }
    if (
      tr.type === "author_reward" ||
      tr.type === "comment_benefactor_reward"
    ) {
      flag = true;
      const hbd_payout = parseAsset(tr.hbd_payout);
      const hive_payout = parseAsset(tr.hive_payout);
      const vesting_payout = parseAsset(tr.vesting_payout);
      numbers = (
        <>
          {tr.he_payout && <span className="number"> {tr.he_payout}</span>}
          {hbd_payout.amount > 0 && (
            <span className="number">
              {formattedNumber(hbd_payout.amount, { suffix: DOLLAR_API_NAME })}
            </span>
          )}
          {hive_payout.amount > 0 && (
            <span className="number">
              {formattedNumber(hive_payout.amount, { suffix: HIVE_API_NAME })}
            </span>
          )}
          {vesting_payout.amount > 0 && (
            <span className="number">
              {formattedNumber(
                vestsToHp(vesting_payout.amount, hivePerMVests),
                { suffix: "HP" }
              )}{" "}
            </span>
          )}
        </>
      );
      details = EntryLink({
        ...this.props,
        entry: {
          category: "history",
          author: tr.author,
          permlink: tr.permlink,
        },
        children: (
          <span>
            {"@"}
            {tr.author}/ {tr.permlink}
          </span>
        ),
      });
    }
    if (tr.type === "comment_benefactor_reward") {
      icon = commentSvg;
      flag = true;
    }
    if (tr.type === "tokens_unstake") {
      flag = true;
      icon = cashMultiple;
      numbers = (
        <>
          <span className="number">{tr.amount}</span>
        </>
      );
    }
    if (tr.type === "tokens_issue") {
      flag = true;
      icon = cashMultiple;
      numbers = (
        <>
          <span className="number"> {tr.amount}</span>
        </>
      );
    }
    if (tr.type === "claim_reward_balance") {
      flag = true;
      const reward_hbd = parseAsset(tr.reward_hbd);
      const reward_hive = parseAsset(tr.reward_hive);
      const reward_vests = parseAsset(tr.reward_vests);
      numbers = (
        <>
          {tr.reward_he && <span className="number"> {tr.reward_he}</span>}
          {reward_hbd.amount > 0 && (
            <span className="number">
              {formattedNumber(reward_hbd.amount, { suffix: DOLLAR_API_NAME })}
            </span>
          )}
          {reward_hive.amount > 0 && (
            <span className="number">
              {formattedNumber(reward_hive.amount, { suffix: HIVE_API_NAME })}
            </span>
          )}
          {reward_vests.amount > 0 && (
            <span className="number">
              {formattedNumber(vestsToHp(reward_vests.amount, hivePerMVests), {
                suffix: "HP",
              })}
            </span>
          )}
        </>
      );
    }
    if (
      tr.type === "transfer" ||
      tr.type === "transfer_to_vesting" ||
      tr.type === "transfer_to_savings"
    ) {
      flag = true;
      icon =
        tr.type === "transfer_to_vesting" ? powerUpSvg : compareHorizontalSvg;
      details = (
        <span>
          {tr.memo ? (
            <>
              {tr.memo} <br /> <br />
            </>
          ) : null}
          <>
            <strong> @ {tr.from}</strong> -&gt; <strong> @ {tr.to}</strong>
          </>
        </span>
      );
      numbers = <span className="number"> {tr.amount}</span>;
    }
    if (
      tr.type === "recurrent_transfer" ||
      tr.type === "fill_recurrent_transfer"
    ) {
      flag = true;
      icon = compareHorizontalSvg;
      details = (
        <span>
          {tr.memo ? (
            <>
              {tr.memo} <br /> <br />
            </>
          ) : null}
          {tr.type === "recurrent_transfer" ? (
            <>
              <Tsx
                k="transactions.type-recurrent_transfer-detail"
                args={{ executions: tr.executions, recurrence: tr.recurrence }}
              >
                <span />
              </Tsx>
              <br />
              <br />
              <strong> @ {tr.from}</strong> -&gt; <strong> @ {tr.to}</strong>
            </>
          ) : (
            <>
              <Tsx
                k="transactions.type-fill_recurrent_transfer-detail"
                args={{ remaining_executions: tr.remaining_executions }}
              >
                <span />
              </Tsx>
              <br />
              <br />
              <strong> @ {tr.from}</strong> -&gt; <strong> @ {tr.to}</strong>
            </>
          )}
        </span>
      );
      let aam = tr.amount;
      if (tr.type === "fill_recurrent_transfer") {
        const t = parseAsset(tr.amount);
        aam = `${t.amount} ${t.symbol}`;
      }
      numbers = <span className="number"> {aam}</span>;
    }
    if (tr.type === "cancel_transfer_from_savings") {
      flag = true;
      icon = closeSvg;
      details = (
        <Tsx
          k="transactions.type-cancel_transfer_from_savings-detail"
          args={{ from: tr.from, request: tr.request_id }}
        >
          <span />
        </Tsx>
      );
    }
    if (tr.type === "tokens_CancelUnstake") {
      flag = true;
      icon = closeSvg;
      numbers = <span className="number"> {tr.amount}</span>;
    }
    if (tr.type === "tokens_unstakeStart") {
      flag = true;
      icon = cashSvg;
      numbers = <span className="number"> {tr.amount}</span>;
    }
    if (tr.type === "tokens_unstakeDone") {
      flag = true;
      icon = cashSvg;
      numbers = <span className="number"> {tr.amount}</span>;
    }
    if (tr.type === "market_placeOrder") {
      flag = true;
      icon = commentSvg;
      numbers = <span className="number"> {tr.quantityLocked}</span>;
      if (tr.price)
        details = (
          <>
            <span> {tr.orderType}</span>{" "}
            <span className="number"> @ {tr.price}</span>
          </>
        );
      else details = tr.orderType;
    }
    if (tr.type === "withdraw_vesting") {
      flag = true;
      icon = cashSvg;
      const vesting_shares = parseAsset(tr.vesting_shares);
      numbers = (
        <span className="number">
          {formattedNumber(vestsToHp(vesting_shares.amount, hivePerMVests), {
            suffix: "HP",
          })}
        </span>
      );
      details = tr.acc ? (
        <span>
          <strong> @ {tr.acc}</strong>
        </span>
      ) : null;
    }
    if (tr.type === "fill_vesting_withdraw") {
      flag = true;
      icon = powerDownSvg;
      numbers = <span className="number"> {tr.deposited}</span>;
      details = tr.from_account ? (
        <span>
          <strong>
            @ {tr.from_account} -&gt; @ {tr.to_account}
          </strong>
        </span>
      ) : null;
    }
    if (tr.type === "fill_order") {
      flag = true;
      icon = reOrderHorizontalSvg;
      numbers = (
        <span className="number">
          {tr.current_pays} = {tr.open_pays}
        </span>
      );
    }
    if (tr.type === "limit_order_create") {
      flag = true;
      icon = reOrderHorizontalSvg;
      numbers = (
        <span className="number">
          {tr.amount_to_sell} = {tr.min_to_receive}
        </span>
      );
    }
    if (tr.type === "limit_order_cancel") {
      flag = true;
      icon = closeSvg;
      numbers = (
        <span className="number">
          #
          {formattedNumber(tr.orderid, {
            fractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </span>
      );
    }
    if (tr.type === "producer_reward") {
      flag = true;
      icon = pickAxeSvg;
      numbers = (
        <>
          {formattedNumber(
            vestsToHp(parseAsset(tr.vesting_shares).amount, hivePerMVests),
            { suffix: "HP" }
          )}
        </>
      );
    }
    if (tr.type === "interest") {
      flag = true;
      icon = cashMultiple;
      numbers = <span className="number"> {tr.interest}</span>;
    }
    if (tr.type === "fill_convert_request") {
      flag = true;
      icon = reOrderHorizontalSvg;
      numbers = (
        <span className="number">
          {tr.amount_in} = {tr.amount_out}
        </span>
      );
    }
    if (tr.type === "collateralized_convert") {
      flag = true;
      icon = reOrderHorizontalSvg;
      numbers = <span className="number"> {tr.amount}</span>;
    }
    if (tr.type === "market_closeOrder") {
      flag = true;
      if (tr.orderType == "sell") {
        icon = arrowRightSvg;
      } else {
        icon = arrowLeftSvg;
      }
      details = (
        <>
          <a
            target={"blockexplorer"}
            href={"https://hiveblockexplorer.com/tx/" + tr.trx_id}
          >
            {tr.orderType}
          </a>
        </>
      );
    }
    if (tr.type === "market_expireOrder") {
      flag = true;
      icon = closeSvg;
      numbers = <>{tr.amountUnlocked}</>;
      details = (
        <>
          <a
            target={"blockexplorer"}
            href={"https://hiveblockexplorer.com/tx/" + tr.trx_id}
          >
            orderID: {tr.orderID}
            {tr.orderType}
          </a>
        </>
      );
    }
    if (tr.type === "market_sell" && (icon = arrowRightSvg)) {
      flag = true;
      numbers = (
        <span className="number">
          {_t("transactions.sold", { q: tr.quote })}
        </span>
      );
      details = (
        <span className="number">{_t("transactions.for", { b: tr.base })}</span>
      );
    }
    if (tr.type === "market_buy" && (icon = arrowLeftSvg)) {
      flag = true;
      numbers = (
        <span className="number">
          {_t("transactions.bought", { q: tr.quote })}
        </span>
      );
      details = (
        <span className="number">{_t("transactions.for", { b: tr.base })}</span>
      );
    }
    if (tr.type === "return_vesting_delegation") {
      flag = true;
      icon = arrowRightSvg;
      if (tr.vesting_shares) {
        numbers = (
          <>
            {formattedNumber(
              vestsToHp(parseAsset(tr.vesting_shares).amount, hivePerMVests),
              { suffix: "HP" }
            )}
          </>
        );
      }
    }
    if (tr.type === "proposal_pay") {
      flag = true;
      icon = ticketSvg;
      numbers = <span className="number"> {tr.payment}</span>;
    }
    if (tr.type === "tokens_undelegateDone") {
      flag = true;
      icon = arrowRightSvg;
      details = <span> trx_id {tr.trx_id}</span>;
    }
    if (tr.type === "tokens_undelegateStart") {
      flag = true;
      icon = arrowRightSvg;
    }
    if (tr.type === "tokens_delegate") {
      flag = true;
      icon = arrowRightSvg;
      details = <span> @ {tr.to}</span>;
      numbers = <span className="number"> {tr.amount}</span>;
    }
    if (tr.type === "market_cancel") {
      flag = true;
      icon = commentSvg;
      details = <span> {tr.orderType}</span>;
      numbers = <span className="number"> {tr.amount}</span>;
    }
    if (tr.type === "comment_payout_update") {
      flag = true;
      icon = starsSvg;
      details = EntryLink({
        ...this.props,
        entry: {
          category: "history",
          author: tr.author,
          permlink: tr.permlink,
        },
        children: (
          <span>
            {"@"}
            {tr.author}/ {tr.permlink}
          </span>
        ),
      });
    }
    if (tr.type === "comment_reward") {
      flag = true;
      icon = cashCoinSvg;
      const payout = parseAsset(tr.payout);
      numbers = (
        <>
          {payout.amount > 0 && (
            <span className="number">
              {formattedNumber(payout.amount, { suffix: DOLLAR_HUMAN_NAME })}
            </span>
          )}
        </>
      );
      details = EntryLink({
        ...this.props,
        entry: {
          category: "history",
          author: tr.author,
          permlink: tr.permlink,
        },
        children: (
          <span>
            {"@"}
            {tr.author}/ {tr.permlink}
          </span>
        ),
      });
    }
    if (tr.type === "collateralized_convert") {
      flag = true;
      icon = exchangeSvg;
      const amount = parseAsset(tr.amount);
      numbers = (
        <>
          {amount.amount > 0 && (
            <span className="number">
              {formattedNumber(amount.amount, { suffix: HIVE_HUMAN_NAME })}
            </span>
          )}
        </>
      );
      details = (
        <Tsx
          k="transactions.type-collateralized_convert-detail"
          args={{ request: tr.requestid }}
        >
          <span />
        </Tsx>
      );
    }
    if (tr.type === "effective_comment_vote") {
      flag = true;
      const payout = parseAsset(tr.pending_payout);
      numbers = (
        <>
          {payout.amount > 0 && (
            <span className="number">
              {formattedNumber(payout.amount, { suffix: DOLLAR_HUMAN_NAME })}
            </span>
          )}
        </>
      );
      details = EntryLink({
        ...this.props,
        entry: {
          category: "history",
          author: tr.author,
          permlink: tr.permlink,
        },
        children: (
          <span>
            {"@"}
            {tr.author}/ {tr.permlink}
          </span>
        ),
      });
    }
    if (flag) {
      const transDate = parseDate(tr.timestamp);
      return (
        <div className="transaction-list-item">
          <div className="transaction-icon"> {icon}</div>
          <div className="transaction-title">
            <div className="transaction-name">
              {_t(`transactions.type-${tr.type}`)}
            </div>
            <div className="transaction-date">
              {moment(transDate).fromNow()}
            </div>
          </div>
          <div className="transaction-numbers"> {numbers}</div>
          <div className="transaction-details"> {details}</div>
        </div>
      );
    }
    return (
      <a className="transaction-list-item transaction-list-item-raw">
        <div className="raw-code"> {JSON.stringify(tr)}</div>
      </a>
    );
  }
}
interface Props {
  history: History;
  dynamicProps: DynamicProps;
  transactions: Transactions;
  account: Account;
  fetchTransactions: (username: string, group?: OperationGroup | "") => void;
}
export class TransactionList extends Component<Props> {
  typeChanged = (
    e: React.ChangeEvent<typeof FormControl & HTMLInputElement>
  ) => {
    const { account, fetchTransactions } = this.props;
    const group = e.target.value;
    fetchTransactions(account.name, group as OperationGroup);
  };
  render() {
    const { transactions } = this.props;
    const { list, loading, group } = transactions;
    return (
      <div className="transaction-list">
        <div className="transaction-list-header">
          <h2> {_t("transactions.title")} </h2>
          <FormControl as="select" value={group} onChange={this.typeChanged}>
            <option value=""> {_t("transactions.group-all")}</option>
            {[
              "transfers",
              "market-orders",
              "interests",
              "stake-operations",
              "rewards",
              //"socials",
            ].map((x) => (
              <option key={x} value={x}>
                {_t(`transactions.group-${x}`)}
              </option>
            ))}
          </FormControl>
        </div>
        {loading && <LinearProgress />}
        {list.map((x, k) => (
          <TransactionRow {...this.props} key={k} transaction={x} />
        ))}
        {!loading && list.length === 0 && (
          <p className="text-muted empty-list"> {_t("g.empty-list")}</p>
        )}
      </div>
    );
  }
}
export default (p: Props) => {
  const props: Props = {
    history: p.history,
    dynamicProps: p.dynamicProps,
    transactions: p.transactions,
    account: p.account,
    fetchTransactions: p.fetchTransactions,
  };
  return <TransactionList {...props} />;
};
