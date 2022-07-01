import React, { Fragment } from "react";

import { History } from "history";
import { Market } from "../market-data";
import moment from "moment";

import { Global } from "../../store/global/types";
import { Account } from "../../store/accounts/types";
import { DynamicProps } from "../../store/dynamic-props/types";
import { OperationGroup, Transactions } from "../../store/transactions/types";
import { ActiveUser } from "../../store/active-user/types";

import BaseComponent from "../base";
import Tooltip from "../tooltip";
import FormattedCurrency from "../formatted-currency";
import TransactionList from "../transactions";
import DelegatedVesting from "../delegated-vesting";
import ReceivedVesting from "../received-vesting";
import DropDown from "../dropdown";
import Transfer, { TransferMode, TransferAsset } from "../transfer";
import { error, success } from "../feedback";
import WalletMenu from "../wallet-menu";
import WithdrawRoutes from "../withdraw-routes";

import HiveWallet from "../../helper/hive-wallet";

import { vestsToHp } from "../../helper/vesting";

import { claimRewardBalance, formatError } from "../../api/operations";

import formattedNumber from "../../util/formatted-number";

import parseAsset from "../../helper/parse-asset";

import { _t } from "../../i18n";

import { plusCircle } from "../../img/svg";
import { TEST_NET } from "../../../client_config";
import {
  getAccount,
  getConversionRequests,
  getCollateralizedConversionRequests,
  HIVE_API_NAME,
  DOLLAR_API_NAME,
  HIVE_HUMAN_NAME_UPPERCASE,
} from "../../api/hive";

import { HiveEngineStaticInfo } from "../../store/hive-engine-tokens/types";
import {
  isNonZeroBalance,
  is_FullHiveEngineAccount,
} from "../../api/hive-engine";
import * as ls from "../../util/local-storage";

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
  hiveEngineTokens: Array<HiveEngineStaticInfo>;
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
  collaterializedConverting: number;
  epochIndex: number;
  epoch: number;
}

const epochs: Array<[number, "years" | "months" | "weeks" | "days"]> = [
  [2, "years"],
  [6, "months"],
  [6, "weeks"],
  [10, "days"],
];

export class WalletHive extends BaseComponent<Props, State> {
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
    collaterializedConverting: 0,
    epochIndex: 0,
    epoch: 0,
  };

  componentDidMount() {
    this.fetchConvertingAmount();
  }

  fetchConvertingAmount = () => {
    const { account } = this.props;

    console.log({ epochIndex: ls.get("chart-epoch-index") });
    let epochIndex: number = parseInt(ls.get("chart-epoch-index")) || 0;
    if (isNaN(epochIndex) || epochIndex < 0 || epochIndex >= epochs.length) {
      epochIndex = 0;
    }

    const fromTs = (() => {
      const e = epochs[epochIndex];
      try {
        console.log(e);
        return moment().subtract(e[0], e[1]).format("X");
      } catch (e) {
        console.log(e);
      }
      return "0";
    })();

    const epoch: number = parseInt(fromTs) || 0;
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

    try {
      // I don't see this not being a function here...
      if (getCollateralizedConversionRequests != undefined)
        getCollateralizedConversionRequests(account.name).then((rs) => {
          let collaterializedConverting = 0;
          for (const r of rs) {
            collaterializedConverting += parseAsset(r.collateral_amount).amount;
          }
          this.setState({ collaterializedConverting });
        });
    } catch (e) {
      console.log("This fails as 'not a function' error.  Is node broken?");
    }

    this.setState({ epoch, epochIndex });
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
    const { activeUser, updateActiveUser } = this.props;
    const { claiming } = this.state;

    if (claiming || !activeUser) {
      return;
    }

    this.stateSet({ claiming: true });

    return getAccount(activeUser?.username!)
      .then((account) => {
        const {
          reward_hive_balance: hiveBalance = account.reward_hive_balance,
          reward_hbd_balance: hbdBalance = account.reward_hbd_balance,
          reward_vesting_balance: vestingBalance,
        } = account;

        return claimRewardBalance(
          activeUser?.username!,
          hiveBalance!,
          hbdBalance!,
          vestingBalance!
        );
      })
      .then(() => getAccount(activeUser.username))
      .then((account) => {
        success(_t("wallet.claim-reward-balance-ok"));
        this.stateSet({ claiming: false, claimed: true });
        updateActiveUser(account);
      })
      .catch((err) => {
        error(formatError(err));
        this.stateSet({ claiming: false });
      });
  };

  openTransferDialog = (mode: TransferMode, asset: TransferAsset) => {
    this.stateSet({ transfer: true, transferMode: mode, transferAsset: asset });
  };

  closeTransferDialog = () => {
    this.stateSet({ transfer: false, transferMode: null, transferAsset: null });
  };

  advanceEpoch = () => {
    const { epochIndex } = this.state;
    const newEpochIndex = (epochIndex + 1) % epochs.length;
    const epoch = parseInt(
      moment()
        .subtract(epochs[newEpochIndex][0], epochs[newEpochIndex][1])
        .format("X")
    );
    ls.set("chart-epoch-index", `${newEpochIndex}`);
    this.stateSet({ epochIndex: newEpochIndex, epoch });
  };

  render() {
    const { global, dynamicProps, account, activeUser, hiveEngineTokens } =
      this.props;
    const {
      claiming,
      claimed,
      transfer,
      transferAsset,
      transferMode,
      converting,
      collaterializedConverting,
      epoch,
      epochIndex,
    } = this.state;

    const fromTs = `${epoch}`;
    if (!epochs[epochIndex]) {
      console.log({ epochs, epochIndex });
      return null;
    }

    const epochName = `${epochs[epochIndex][0]} ${epochs[epochIndex][1]}`;

    if (!account.__loaded) {
      return null;
    }

    const { hivePerMVests } = dynamicProps;
    const isMyPage = activeUser && activeUser.username === account.name;
    const w = new HiveWallet(account, dynamicProps, converting);

    const hiveEngineTokensNZ = (() => {
      try {
        let out = [];
        if (is_FullHiveEngineAccount(account)) {
          const { token_balances } = account;
          for (const h of hiveEngineTokens) {
            const tb = token_balances.find((ttb) => ttb.symbol == h.apiName);
            if (tb && isNonZeroBalance(tb)) {
              out.push(h);
            }
          }
          return out;
        } else {
          return [];
        }
      } catch (e) {
        return [];
      }
    })();
    try {
    const toNow = moment().format("X");

    return (
      <div className="wallet-hive">
        <div className="wallet-main">
          <div className="wallet-info">
            {w.hasUnclaimedRewards && !claimed && (
              <div className="unclaimed-rewards">
                <div className="title">{_t("wallet.unclaimed-rewards")}</div>
                <div className="rewards">
                  {w.rewardHiveBalance > 0 && (
                    <span className="reward-type">{`${w.rewardHiveBalance} ${HIVE_API_NAME}`}</span>
                  )}
                  {w.rewardHbdBalance > 0 && (
                    <span className="reward-type">{`${w.rewardHbdBalance} ${DOLLAR_API_NAME}`}</span>
                  )}
                  {w.rewardVestingHive > 0 && (
                    <span className="reward-type">{`${w.rewardVestingHive} HP`}</span>
                  )}
                  {isMyPage && (
                    <Tooltip content={_t("wallet.claim-reward-balance")}>
                      <a
                        className={`claim-btn ${claiming ? "in-progress" : ""}`}
                        onClick={this.claimRewardBalance}
                      >
                        {plusCircle}
                      </a>
                    </Tooltip>
                  )}
                </div>
              </div>
            )}

            <div className="balance-row estimated alternative">
              <div className="balance-info">
                <div className="title">{_t("wallet.estimated")}</div>
                <div className="description">
                  {_t("wallet.estimated-description")}
                </div>
              </div>
              <div className="balance-values">
                <div className="amount amount-bold">
                  <FormattedCurrency
                    {...this.props}
                    value={w.estimatedValue}
                    fixAt={3}
                  />
                </div>
              </div>
            </div>

            <div className="balance-row hive">
              <div className="balance-info">
                <div className="title">{HIVE_HUMAN_NAME_UPPERCASE}</div>
                <div className="description">
                  {_t("wallet.hive-description")}
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
                            label: _t("wallet.transfer"),
                            onClick: () => {
                              this.openTransferDialog(
                                "transfer",
                                HIVE_API_NAME
                              );
                            },
                          },
                          {
                            label: _t("wallet.transfer-to-savings"),
                            onClick: () => {
                              this.openTransferDialog(
                                "transfer-saving",
                                HIVE_API_NAME
                              );
                            },
                          },
                          {
                            label: _t("wallet.power-up"),
                            onClick: () => {
                              this.openTransferDialog(
                                "power-up",
                                HIVE_API_NAME
                              );
                            },
                          },
                          {
                            label: "Borrow new HBD against Hive",
                            onClick: () => {
                              this.openTransferDialog(
                                "borrow",
                                DOLLAR_API_NAME
                              );
                            },
                          },
                          {
                            label: _t("wallet.trade-internal-market"),
                            onClick: () => {
                              window.open(
                                `https://wallet.hive.blog/market`,
                                "HiveDEx"
                              );
                            },
                          },
                          {
                            label: _t("wallet.trade-on-Blocktrades"),
                            onClick: () => {
                              window.open(
                                `https://blocktrades.us/`,
                                "BlockTrades"
                              );
                            },
                          },
                          {
                            label: _t("wallet.trade-on-Upbit"),
                            onClick: () => {
                              window.open(`https://upbit.com/`, "UpBit");
                            },
                          },
                          {
                            label: _t("wallet.trade-on-BitTrex"),
                            onClick: () => {
                              window.open(
                                `https://global.bittrex.com/`,
                                "BitTrex"
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
                    {formattedNumber(w.balance, {
                      suffix: HIVE_HUMAN_NAME_UPPERCASE,
                    })}
                  </span>
                </div>
                {collaterializedConverting > 0 && (
                  <div className="amount amount-passive converting-hbd">
                    <Tooltip content={_t("wallet.collateral-hive-amount")}>
                      <span>
                        {"+"}{" "}
                        {formattedNumber(collaterializedConverting, {
                          suffix: HIVE_HUMAN_NAME_UPPERCASE,
                        })}
                      </span>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>

            <div className="balance-row hive-power alternative">
              <div className="balance-info">
                <div className="title">
                  {_t(TEST_NET ? "wallet.test-power" : "wallet.hive-power")}
                </div>
                <div className="description">
                  {_t(
                    TEST_NET
                      ? "wallet.test-power-description"
                      : "wallet.hive-power-description"
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
                            label: _t("wallet.delegate"),
                            onClick: () => {
                              this.openTransferDialog("delegate", "HP");
                            },
                          },
                          {
                            label: _t("wallet.power-down"),
                            onClick: () => {
                              this.openTransferDialog("power-down", "HP");
                            },
                          },
                          {
                            label: _t("wallet.withdraw-routes"),
                            onClick: () => {
                              this.toggleWithdrawRoutes();
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
                  {formattedNumber(vestsToHp(w.vestingShares, hivePerMVests), {
                    suffix: "HP",
                  })}
                </div>

                {w.vestingSharesDelegated > 0 && (
                  <div className="amount amount-passive delegated-shares">
                    <Tooltip content={_t("wallet.hive-power-delegated")}>
                      <span
                        className="amount-btn"
                        onClick={this.toggleDelegatedList}
                      >
                        {formattedNumber(
                          vestsToHp(w.vestingSharesDelegated, hivePerMVests),
                          { prefix: "-", suffix: "HP" }
                        )}
                      </span>
                    </Tooltip>
                  </div>
                )}

                {(() => {
                  if (w.vestingSharesReceived <= 0) {
                    return null;
                  }

                  const strReceived = formattedNumber(
                    vestsToHp(w.vestingSharesReceived, hivePerMVests),
                    { prefix: "+", suffix: "HP" }
                  );

                  if (global.usePrivate) {
                    return (
                      <div className="amount amount-passive received-shares">
                        <Tooltip content={_t("wallet.hive-power-received")}>
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
                      <Tooltip content={_t("wallet.hive-power-received")}>
                        <span className="amount">{strReceived}</span>
                      </Tooltip>
                    </div>
                  );
                })()}

                {w.nextVestingSharesWithdrawal > 0 && (
                  <div className="amount amount-passive next-power-down-amount">
                    <Tooltip content={_t("wallet.next-power-down-amount")}>
                      <span>
                        {formattedNumber(
                          vestsToHp(
                            w.nextVestingSharesWithdrawal,
                            hivePerMVests
                          ),
                          { prefix: "-", suffix: "HP" }
                        )}
                      </span>
                    </Tooltip>
                  </div>
                )}

                {(w.vestingSharesDelegated > 0 ||
                  w.vestingSharesReceived > 0 ||
                  w.nextVestingSharesWithdrawal > 0) && (
                  <div className="amount total-hive-power">
                    <Tooltip content={_t("wallet.hive-power-total")}>
                      <span>
                        {formattedNumber(
                          vestsToHp(w.vestingSharesTotal, hivePerMVests),
                          { prefix: "=", suffix: "HP" }
                        )}
                      </span>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>

            <div className="balance-row hive-dollars">
              <div className="balance-info">
                <div className="title">
                  {_t(TEST_NET ? "wallet.test-dollars" : "wallet.hive-dollars")}
                </div>
                <div className="description">
                  {_t(
                    TEST_NET
                      ? "wallet.test-dollars-description"
                      : "wallet.hive-dollars-description"
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
                            label: _t("wallet.transfer"),
                            onClick: () => {
                              this.openTransferDialog(
                                "transfer",
                                DOLLAR_API_NAME
                              );
                            },
                          },
                          {
                            label: _t("wallet.transfer-to-savings"),
                            onClick: () => {
                              this.openTransferDialog(
                                "transfer-saving",
                                DOLLAR_API_NAME
                              );
                            },
                          },
                          {
                            label: _t("wallet.convert"),
                            onClick: () => {
                              this.openTransferDialog(
                                "convert",
                                DOLLAR_API_NAME
                              );
                            },
                          },
                          {
                            label: _t("wallet.trade-internal-market"),
                            onClick: () => {
                              window.open(
                                `https://wallet.hive.blog/market`,
                                "HiveDEx"
                              );
                            },
                          },
                          {
                            label: _t("wallet.trade-on-Blocktrades"),
                            onClick: () => {
                              window.open(
                                `https://blocktrades.us/`,
                                "BlockTrades"
                              );
                            },
                          },
                          {
                            label: _t("wallet.trade-on-Upbit"),
                            onClick: () => {
                              window.open(`https://upbit.com/`, "UpBit");
                            },
                          },
                          {
                            label: _t("wallet.trade-on-BitTrex"),
                            onClick: () => {
                              window.open(
                                `https://global.bittrex.com/`,
                                "BitTrex"
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
                  <span>{formattedNumber(w.hbdBalance, { prefix: "$" })}</span>
                </div>

                {converting > 0 && (
                  <div className="amount amount-passive converting-hbd">
                    <Tooltip content={_t("wallet.converting-hbd-amount")}>
                      <span>
                        {"+"} {formattedNumber(converting, { prefix: "$" })}
                      </span>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>

            <div className="balance-row savings alternative">
              <div className="balance-info">
                <div className="title">{_t("wallet.savings")}</div>
                <div className="description">
                  {_t("wallet.savings-description")}
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
                            label: _t("wallet.withdraw-hive"),
                            onClick: () => {
                              this.openTransferDialog(
                                "withdraw-saving",
                                HIVE_API_NAME
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
                    {formattedNumber(w.savingBalance, {
                      suffix: HIVE_HUMAN_NAME_UPPERCASE,
                    })}
                  </span>
                </div>
                <div className="amount">
                  {(() => {
                    if (isMyPage) {
                      const dropDownConfig = {
                        history: this.props.history,
                        label: "",
                        items: [
                          {
                            label: _t("wallet.withdraw-hbd"),
                            onClick: () => {
                              this.openTransferDialog(
                                "withdraw-saving",
                                DOLLAR_API_NAME
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
                    {formattedNumber(w.savingBalanceHbd, { prefix: "$" })}
                  </span>
                </div>
              </div>
            </div>

            {w.isPoweringDown && (
              <div className="next-power-down">
                {_t("wallet.next-power-down", {
                  time: moment(w.nextVestingWithdrawalDate).fromNow(),
                  amount: formattedNumber(w.nextVestingSharesWithdrawalHive, {
                    suffix: HIVE_HUMAN_NAME_UPPERCASE,
                  }),
                })}
              </div>
            )}

            {TransactionList({ ...this.props })}
          </div>
          <div>
            <WalletMenu
              global={global}
              username={account.name}
              active="hive"
              hiveEngineTokens={hiveEngineTokensNZ}
            />
            <div onClick={this.advanceEpoch}>
              <Market
                key={fromTs}
                label={"HBD/USD last " + epochName}
                coin="hive_dollar"
                vsCurrency="usd"
                fromTs={fromTs}
                toTs={toNow}
                formatter="0.000$"
              />
            </div>
            <div onClick={this.advanceEpoch}>
              <Market
                key={fromTs}
                label={"Hive/USD last " + epochName}
                coin="hive"
                vsCurrency="usd"
                fromTs={fromTs}
                toTs={toNow}
                formatter="0.000$"
              />
            </div>
          </div>
        </div>

        {transfer && (
          <Transfer
            {...this.props}
            activeUser={activeUser!}
            mode={transferMode!}
            asset={transferAsset!}
            onHide={this.closeTransferDialog}
            hiveEngineTokensEnabled={hiveEngineTokens.map((z) => z.apiName)}
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
    } catch (e) {
      return e.message;
    }
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
    hiveEngineTokens: p.hiveEngineTokens,
  };

  return <WalletHive {...props} />;
};
