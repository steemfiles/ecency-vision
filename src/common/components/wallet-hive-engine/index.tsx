import React from "react";
// Saboin — Today at 8:07 PM
// They are custom_json operations with the id ssc-mainnet-hive, and signed with the active key, so you put your account name in required_auths.
// https://github.com/hive-engine/steemsmartcontracts-wiki/blob/master/Tokens-Contract.md
import { History } from "history";
import moment from "moment";
import { Global } from "../../store/global/types";
import { Account } from "../../store/accounts/types";
import { DynamicProps } from "../../store/dynamic-props/types";
import {
  HEFineTransactionToHiveTransactions,
  HEToHTransaction,
} from "../../store/transactions/convert";
import {
  OperationGroup,
  Transactions,
  Transaction,
  HEFineTransaction,
  HECoarseTransaction,
} from "../../store/transactions/types";
import { ActiveUser } from "../../store/active-user/types";
import BaseComponent from "../base";
import Tooltip from "../tooltip";
import FormattedCurrency from "../formatted-currency";
import TransactionList from "../transactions";
import DelegatedVesting from "../delegated-vesting-hive-engine";
import ReceivedVesting from "../received-vesting";
import DropDown from "../dropdown";
import Transfer, { TransferMode, TransferAsset } from "../transfer";
import { error, success } from "../feedback";
import WalletMenu from "../wallet-menu";
import WithdrawRoutes from "../withdraw-routes";
import {
  is_FullHiveEngineAccount,
  is_not_FullHiveEngineAccount,
  FullHiveEngineAccount,
  getAccountHEFull,
  TokenStatus,
  getFineTransactions,
  getCoarseTransactions,
} from "../../api/hive-engine";
import HiveEngineWallet from "../../helper/hive-engine-wallet";
import { getAccount, getConversionRequests } from "../../api/hive";
import {
  claimHiveEngineRewardBalance,
  claimRewardBalance,
  formatError,
} from "../../api/operations";
import formattedNumber from "../../util/formatted-number";
import parseAsset from "../../helper/parse-asset";
import { _t } from "../../i18n";
import { plusCircle } from "../../img/svg";
import { resolveAny } from "dns";
import { getScotDataAsync, TokenBalance, UnStake } from "../../api/hive-engine";
import HiveWallet from "../../helper/hive-wallet";
interface Props {
  history: History;
  global: Global;
  dynamicProps: DynamicProps;
  activeUser: ActiveUser | null;
  transactions: Transactions;
  account: Account;
  signingKey: string;
  addAccount: (data: Account) => void;
  updateActiveUser: (data?: Account) => void;
  setSigningKey: (key: string) => void;
  fetchTransactions: (username: string, group?: OperationGroup | "") => void;
  coinName: string;
  aPICoinName: string;
  stakedCoinName: string;
}
interface State {
  delegatedList: boolean;
  receivedList: boolean;
  claiming: boolean;
  claimed: boolean;
  transfer: boolean;
  withdrawRoutes: boolean;
  transferMode: null | TransferMode;
  transferAsset: null | TransferAsset;
  converting: number;
  transactions: Transactions;
}
function resolveAfter2Seconds(x: string): Promise<string> {
  return new Promise<string>((resolve) => {
    setTimeout(() => {
      console.log("simulating a network event");
      resolve(x);
    }, 2000);
  });
}
function resolveImediately(x: string): Promise<string> {
  return new Promise<string>((resolve) => {
    resolve(x);
  });
}
interface TxInfo {
  block_num: number;
  expired: boolean;
  id: string;
  trx_num: number;
}
export class WalletHiveEngine extends BaseComponent<Props, State> {
  state: State = {
    delegatedList: false,
    receivedList: false,
    claiming: false,
    claimed: false,
    transfer: false,
    withdrawRoutes: false,
    transferMode: null,
    transferAsset: null,
    converting: 0,
    transactions: { list: [], loading: false, group: "" },
  };
  componentDidMount() {
    const { account, aPICoinName } = this.props;
    this.fetchConvertingAmount();
    this.fetchHETransactions(aPICoinName, account.name, "");
  }
  keepTransaction(group: OperationGroup | "", tx: Transaction): boolean {
    switch (group) {
      case "transfers":
        return [
          "transfers",
          "transfer_to_vesting",
          "transfer_to_saving",
          "withdraw_vesting",
          "proposal-pay",
          "cancel_transfer_from_savings",
          "producer_reward",
          "claim_reward_balance",
        ].includes(tx.type);
      case "interests":
        return tx.type === "interest";
      case "rewards":
        return tx.type.endsWith("_reward") || tx.type == "tokens_issue";
      case "market-orders":
        return tx.type.startsWith("market_") || tx.type === "fill_order";
      case "stake-operations":
        return (
          "transfer_to_saving,withdraw_vesting,tokens_unstakeDone,tokens_stake,withdraw_vesting," +
          "return_vesting_delegation,tokens_unstakeStart,tokens_CancelUnstake," +
          "tokens_unstake,tokens_undelegateDone,tokens_delegate," +
          "tokens_undelegateStart"
        )
          .split(/,/)
          .includes(tx.type);
    }
    return true;
  }
  compareTransactions(a: Transaction, b: Transaction) {
    return a.timestamp > b.timestamp ? -1 : 1;
  }
  handleFineTransactions(fts: Array<HEFineTransaction>) {
    const { transactions } = this.state;
    const { list } = transactions;
    const ntxs = [...HEFineTransactionToHiveTransactions(fts), ...list]
      .filter(this.keepTransaction.bind(this, transactions.group))
      .sort(this.compareTransactions);
    this.stateSet({
      transactions: { list: ntxs, loading: false, group: transactions.group },
    });
  }
  handleCoarseTransactions(
    group: OperationGroup | "",
    cts: Array<HECoarseTransaction>
  ) {
    const { transactions } = this.state;
    try {
      const txs: Array<Transaction> = cts
        .map((t) => HEToHTransaction(t))
        .filter((x) => x != null)
        // @ts-ignore
        .filter(this.keepTransaction.bind(this, transactions.group));
      const { list } = transactions;
      this.stateSet({
        transactions: { list: txs, loading: false, group: transactions.group },
      });
    } catch (e) {
      error("Unknown transaction type error.");
      console.log(e);
      this.stateSet({
        transactions: {
          list: transactions.list,
          loading: false,
          group: transactions.group,
        },
      });
    }
  }
  fetchHETransactions = (
    symbol: string,
    name: string,
    group?: OperationGroup | ""
  ) => {
    const { transactions } = this.state;
    const { list } = transactions;
    this.stateSet({
      transactions: { list: [], loading: true, group: group || "" },
    });
    if (group === "rewards")
      getFineTransactions(symbol, name, group === "rewards" ? 200 : 10, 0)
        .then(this.handleFineTransactions.bind(this))
        .catch((e) => {
          console.log(e);
        });
    else
      getCoarseTransactions(name, 400, symbol, 0).then(
        this.handleCoarseTransactions.bind(this, group ? group : "")
      );
  };
  fetchConvertingAmount = () => {
    const { account } = this.props;
    getConversionRequests(account.name).then((r) => {
      if (r.length === 0) {
        return;
      }
      let converting = 0;
      r.forEach((x) => {
        converting += parseAsset(x.amount).amount;
      });
      this.stateSet({ converting });
    });
  };
  toggleDelegatedList = () => {
    const { delegatedList } = this.state;
    this.stateSet({ delegatedList: !delegatedList });
  };
  toggleReceivedList = () => {
    const { receivedList } = this.state;
    this.stateSet({ receivedList: !receivedList });
  };
  toggleWithdrawRoutes = () => {
    const { withdrawRoutes } = this.state;
    this.stateSet({ withdrawRoutes: !withdrawRoutes });
  };
  claimRewardBalance = () => {
    const {
      activeUser,
      dynamicProps,
      global,
      updateActiveUser,
      aPICoinName,
      coinName,
    } = this.props;
    const { claiming } = this.state;
    if (
      claiming ||
      !activeUser ||
      is_not_FullHiveEngineAccount(activeUser.data)
    ) {
      return;
    }
    let tokenStatus: TokenStatus | null = null;
    const pending_token_100millionths: number = (() => {
      try {
        const account = activeUser.data;
        if (is_not_FullHiveEngineAccount(account)) {
          updateActiveUser(activeUser.data);
          return 0;
        }
        let x;
        const tokenStatuses = (account as FullHiveEngineAccount).token_statuses;
        if ((x = tokenStatuses.hiveData) && (x = x[aPICoinName])) {
          tokenStatus = x;
          return tokenStatus.pending_token || 0;
        }
      } catch (e) {}
      return 0;
    })();
    if (!tokenStatus || pending_token_100millionths === 0) {
      console.log("Exception getting pending token", {
        tokenStatus,
        pending_token_100millionths,
      });
      return;
    }
    this.stateSet({ claiming: true });
    const { precision } = tokenStatus;
    const normalized_amount: string =
      pending_token_100millionths * Math.pow(10, -precision) +
      " " +
      aPICoinName;
    let account = activeUser.data as FullHiveEngineAccount;
    // pending_token_100millionths is in satoshis.  Claim function requires it to be a string with units.
    const failed = () => this.stateSet({ claiming: false });
    const successful = () => this.stateSet({ claiming: false, claimed: true });
    return (
      claimHiveEngineRewardBalance(
        activeUser.username,
        activeUser.username,
        normalized_amount
      )
        //return resolveAfter2Seconds("testing: not claiming balance for real")
        .then((txInfo) => {
          /* In two tests of this routine, the round trip  time between sending out the transaction
					* and seeing the new pending_token value set to zero from a query come back was six and seven iterations.
					* of 4.5s each.  This is 27~31.5 seconds.
					I decided it would be best to simply wait 25 s and then start polling the scot API every 2.5s.  So it wouldn't be
					pulling in the old data over and over again until the data is likely to be ready.
					*/
          //if (txInfo.expired) {
          //	error("the transaction has expired");
          //}
          const time_interval_length = 2500;
          let counter = 0;
          let attempt_number = 0;
          const check_handle = setInterval(() => {
            try {
              ++counter;
              if (counter < 10) {
                // don't even try yet.
                return;
              }
              console.log(
                "Trying to reload the pending_token amount for ",
                coinName,
                ".  Attempt #" +
                  ++attempt_number +
                  " @" +
                  (time_interval_length / 1000) * counter +
                  "s"
              );
              getScotDataAsync<{ [aPICoinName: string]: TokenStatus }>(
                `@${account.name}`,
                { hive: 1, token: aPICoinName }
              ).then((tokenStatuses) => {
                if (tokenStatuses[aPICoinName]) {
                  const tokenStatus = tokenStatuses[aPICoinName];
                  if (tokenStatus.pending_token === 0) {
                    clearInterval(check_handle);
                    success(_t("wallet.claim-reward-balance-ok"));
                    successful();
                    updateActiveUser(account);
                  } else {
                    console.log(
                      "The loading of the account worked fine but the pending balance has not yet been updtaed."
                    );
                  } // end if
                } else {
                  console.log(
                    "The account data returned an unexpected data structure:",
                    { account }
                  );
                } // end if
              }); // getAccountHEFull.then
            } catch (e) {
              console.log("Exception was thrown in the handler");
            }
            if (counter > 20) {
              clearInterval(check_handle);
              error(
                formatError({ message: "Could not claim any " + coinName })
              );
              failed();
            }
          }, time_interval_length);
        })
        .catch((err) => {
          error(formatError(err));
          failed();
        })
    );
  };
  openTransferDialog = (mode: TransferMode, asset: TransferAsset) => {
    const { aPICoinName, stakedCoinName } = this.props;
    if (mode === "power-down" && asset === aPICoinName) {
      asset = stakedCoinName;
    }
    this.stateSet({ transfer: true, transferMode: mode, transferAsset: asset });
  };
  closeTransferDialog = () => {
    this.stateSet({ transfer: false, transferMode: null, transferAsset: null });
  };
  render() {
    const { global, dynamicProps, account, activeUser, aPICoinName } =
      this.props;
    const {
      claiming,
      claimed,
      transfer,
      transferAsset,
      transferMode,
      converting,
      transactions,
    } = this.state;
    if (!account.__loaded) {
      return null;
    }
    const { hiveEngineTokensProperties } = global;
    const tokenProperties =
      hiveEngineTokensProperties && hiveEngineTokensProperties[aPICoinName];
    const precision = (() => {
      const p1 =
        tokenProperties &&
        tokenProperties.info &&
        tokenProperties.info.precision;
      if (p1 === null || p1 == undefined) return 0;
      else return p1;
    })();
    const { hivePerMVests } = dynamicProps;
    const isMyPage = activeUser && activeUser.username === account.name;
    const pending_token = (() => {
      try {
        if (is_not_FullHiveEngineAccount(account)) {
          return 0;
        }
        let x;
        const tokenStatuses = (account as FullHiveEngineAccount).token_statuses;
        if ((x = tokenStatuses.hiveData) && (x = x[aPICoinName])) {
          const { precision, pending_token } = x;
          return pending_token * Math.pow(10, -precision);
        }
      } catch (e) {}
      return 0;
    })();
    const w = new HiveEngineWallet(
      account,
      dynamicProps,
      converting,
      aPICoinName
    );
    const balances = w.engineBalanceTable[this.props.aPICoinName] || {
      _id: 0,
      account: account.name,
      symbol: this.props.aPICoinName,
      balance: 0,
      stake: 0,
      pendingUnstake: 0,
      delegationsIn: 0,
      delegationsOut: 0,
      pendingUndelegations: 0,
    };
    const { token_unstakes } = account as FullHiveEngineAccount;
    if (token_unstakes) {
      let powerDownId;
      const token_unstake: undefined | UnStake =
        token_unstakes &&
        token_unstakes.find((u) => u.symbol === this.props.aPICoinName);
      if (token_unstake) powerDownId = token_unstake.txID;
      return (
        <div className="wallet-hive">
          <div className="wallet-main">
            <div className="wallet-info">
              {pending_token > 0 && !claimed && (
                <div className="unclaimed-rewards">
                  <div className="title">{_t("wallet.unclaimed-rewards")}</div>
                  <div className="rewards">
                    {pending_token > 0 && (
                      <span className="reward-type">
                        {formattedNumber(pending_token, {
                          fractionDigits: precision,
                          suffix: aPICoinName,
                        })}
                      </span>
                    )}
                    {isMyPage && (
                      <Tooltip content={_t("wallet.claim-reward-balance")}>
                        <a
                          className={`claim-btn ${
                            claiming ? "in-progress" : ""
                          }`}
                          onClick={this.claimRewardBalance}
                        >
                          {plusCircle}
                        </a>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )}
              {isMyPage && (
                <div className="balance-row estimated alternative">
                  <div className="balance-info">
                    <div className="title">{_t("wallet.estimated")}</div>
                    <div className="description">
                      {_t("wallet.estimated-description")}
                    </div>
                  </div>
                  <div className="balance-values">
                    <div className="amount amount-bold">
                      {tokenProperties ? (
                        <FormattedCurrency
                          {...this.props}
                          value={w.estimatedValue}
                          fixAt={3}
                        />
                      ) : (
                        _t("wallet.loading")
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="balance-row">
                <div className="balance-info">
                  <div className="title">{this.props.coinName}</div>
                  <div className="description">
                    {_t("wallet." + this.props.aPICoinName + "-description")}
                  </div>
                </div>
                <div className="balance-values">
                  <div className="amount">
                    {(() => {
                      if (isMyPage) {
                        const dropDownConfig = {
                          history: this.props.history,
                          label: "",
                          items: [
                            {
                              label: "Wallet Operations",
                              onClick: () => {
                                window.open(
                                  `https://www.proofofbrain.io/@${account.name}/transfers`,
                                  "origPOB"
                                );
                              },
                            },
                            {
                              label: _t("wallet.transfer"),
                              onClick: () => {
                                this.openTransferDialog(
                                  "transfer",
                                  this.props.aPICoinName
                                );
                              },
                            },
                            {
                              label: _t("wallet.power-up"),
                              onClick: () => {
                                this.openTransferDialog(
                                  "power-up",
                                  this.props.aPICoinName
                                );
                              },
                            },
                            {
                              label: "Trade at LeoDex",
                              onClick: () => {
                                window.open(
                                  "https://leodex.io/market/POB",
                                  "leodex"
                                );
                              },
                            },
                            {
                              label: "Trade at TribalDex",
                              onClick: () => {
                                window.open(
                                  "https://tribaldex.com/trade/POB",
                                  "tribaldex"
                                );
                              },
                            },
                            {
                              label: `Trade at HiveEngine`,
                              onClick: () => {
                                window.open(
                                  `https://hive-engine.com/?p=market&t=${this.props.aPICoinName}`,
                                  "hiveEngineDex"
                                );
                              },
                            },
                          ],
                        };
                        return (
                          <div className="amount-actions">
                            <DropDown {...dropDownConfig} float="right" />
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <span>
                      {tokenProperties
                        ? formattedNumber(balances.balance, {
                            fractionDigits: precision,
                            suffix: this.props.aPICoinName,
                          })
                        : _t("wallet.loading")}
                    </span>
                  </div>
                </div>
              </div>

              {
                <div className="balance-row hive-power alternative">
                  <div className="balance-info">
                    <div className="title">{this.props.stakedCoinName}</div>
                    <div className="description">
                      {_t(
                        "wallet.staked-" +
                          this.props.aPICoinName +
                          "-description"
                      )}
                    </div>
                  </div>
                  <div className="balance-values">
                    <div className="amount">
                      {(() => {
                        if (isMyPage) {
                          const dropDownConfig = {
                            history: this.props.history,
                            label: "",
                            items: [
                              {
                                label: "Wallet Operations",
                                onClick: () => {
                                  window.open(
                                    `https://www.proofofbrain.io/@${account.name}/transfers`,
                                    "origPOB"
                                  );
                                },
                              },
                              {
                                label: _t("wallet.delegate"),
                                onClick: () => {
                                  this.openTransferDialog(
                                    "delegate",
                                    this.props.aPICoinName
                                  );
                                },
                              },
                              {
                                label: _t("wallet.power-down"),
                                onClick: () => {
                                  this.openTransferDialog(
                                    "power-down",
                                    this.props.aPICoinName
                                  );
                                },
                              },
                              //{
                              //	label: _t('wallet.withdraw-routes'),
                              //	onClick: () => {
                              //		this.toggleWithdrawRoutes();
                              //	},
                              //},
                            ],
                          };
                          return (
                            <div className="amount-actions">
                              <DropDown {...dropDownConfig} float="right" />
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {tokenProperties
                        ? formattedNumber(balances.stake, {
                            suffix: this.props.aPICoinName,
                            fractionDigits: precision,
                          })
                        : _t("wallet.loading")}
                    </div>
                    {balances.delegationsOut > 0 && (
                      <div className="amount amount-passive delegated-shares">
                        <Tooltip
                          content={_t(
                            "wallet." +
                              this.props.aPICoinName +
                              "-power-delegated"
                          )}
                        >
                          <span
                            className="amount-btn"
                            onClick={this.toggleDelegatedList}
                          >
                            {formattedNumber(balances.delegationsOut, {
                              suffix: this.props.aPICoinName,
                              fractionDigits: precision,
                            })}
                          </span>
                        </Tooltip>
                      </div>
                    )}
                    {(() => {
                      if (balances.delegationsIn <= 0) {
                        return null;
                      }
                      const strReceived = formattedNumber(
                        balances.delegationsIn,
                        { prefix: "+", suffix: this.props.aPICoinName }
                      );
                      if (global.usePrivate) {
                        return (
                          <div className="amount amount-passive received-shares">
                            <Tooltip
                              content={_t(
                                "wallet." +
                                  this.props.aPICoinName +
                                  "-power-received"
                              )}
                            >
                              <span
                                className="amount-btn"
                                onClick={this.toggleReceivedList}
                              >
                                {strReceived}
                              </span>
                            </Tooltip>
                          </div>
                        );
                      }
                      return (
                        <div className="amount amount-passive received-shares">
                          <Tooltip
                            content={_t(
                              "wallet." +
                                this.props.aPICoinName +
                                "-power-received"
                            )}
                          >
                            <span className="amount">{strReceived}</span>
                          </Tooltip>
                        </div>
                      );
                    })()}
                    {(() => {
                      return (
                        token_unstake && (
                          <div className="amount amount-passive next-power-down-amount">
                            <Tooltip
                              content={_t("wallet.next-power-down-amount")}
                            >
                              <span>
                                {(() => {
                                  try {
                                    const numberTransactionsLeft: number =
                                      parseFloat(
                                        token_unstake.numberTransactionsLeft
                                      );
                                    const quantityLeft: number = parseFloat(
                                      token_unstake.quantityLeft
                                    );
                                    return formattedNumber(
                                      numberTransactionsLeft / quantityLeft,
                                      {
                                        prefix: "-",
                                        suffix: this.props.aPICoinName,
                                        fractionDigits: 8,
                                      }
                                    );
                                  } catch (e) {
                                    return "Error in calculations...";
                                  }
                                })()}
                              </span>
                            </Tooltip>
                          </div>
                        )
                      );
                    })()}
                    {(balances.delegationsOut > 0 ||
                      balances.delegationsIn > 0 ||
                      token_unstake) && (
                      <div className="amount total-hive-power">
                        <Tooltip content={_t("wallet.hive-power-total")}>
                          <span>
                            {formattedNumber(
                              balances.stake -
                                (token_unstake
                                  ? parseFloat(token_unstake.quantity)
                                  : 0) +
                                balances.delegationsIn -
                                balances.delegationsOut,
                              { prefix: "=", suffix: this.props.aPICoinName }
                            )}
                          </span>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>
              }
              {TransactionList({
                dynamicProps,
                fetchTransactions: this.fetchHETransactions.bind(
                  this,
                  aPICoinName
                ),
                history: this.props.history,
                transactions: this.state.transactions,
                account: this.props.account,
              })}
            </div>
            <WalletMenu
              global={global}
              username={account.name}
              active="hiveEngine"
            />
          </div>
          {transfer && (
            <Transfer
              {...this.props}
              activeUser={activeUser!}
              mode={transferMode!}
              asset={transferAsset!}
              LIQUID_TOKEN_balances={balances}
              LIQUID_TOKEN_precision={precision}
              onHide={this.closeTransferDialog}
            />
          )}
          {this.state.delegatedList && (
            <DelegatedVesting
              {...this.props}
              account={account}
              onHide={this.toggleDelegatedList}
            />
          )}
          {this.state.receivedList && (
            <ReceivedVesting
              {...this.props}
              account={account}
              onHide={this.toggleReceivedList}
            />
          )}
          {this.state.withdrawRoutes && (
            <WithdrawRoutes
              {...this.props}
              activeUser={activeUser!}
              onHide={this.toggleWithdrawRoutes}
            />
          )}
        </div>
      );
    } else {
      return <div>Hive Engine Data not available</div>;
    } // if
  }
}
export default (p: Props) => {
  const props = {
    history: p.history,
    global: p.global,
    dynamicProps: p.dynamicProps,
    activeUser: p.activeUser,
    transactions: p.transactions,
    account: p.account,
    signingKey: p.signingKey,
    addAccount: p.addAccount,
    updateActiveUser: p.updateActiveUser,
    setSigningKey: p.setSigningKey,
    fetchTransactions: p.fetchTransactions,
    aPICoinName: p.aPICoinName,
    coinName: p.coinName,
    stakedCoinName: p.stakedCoinName,
  };
  return <WalletHiveEngine {...props} />;
};
