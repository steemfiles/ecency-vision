import React from "react";

// Saboin — Today at 8:07 PM
// They are custom_json operations with the id ssc-mainnet-hive, and signed with the active key, so you put your account name in required_auths.


// https://github.com/hive-engine/steemsmartcontracts-wiki/blob/master/Tokens-Contract.md


import {History} from "history";

import moment from "moment";

import {Global} from "../../store/global/types";
import {Account} from "../../store/accounts/types";
import {DynamicProps} from "../../store/dynamic-props/types";
import {OperationGroup, Transactions} from "../../store/transactions/types";
import {ActiveUser} from "../../store/active-user/types";

import BaseComponent from "../base";
import Tooltip from "../tooltip";
import FormattedCurrency from "../formatted-currency";
import TransactionList from "../transactions";
import DelegatedVesting from "../delegated-vesting";
import ReceivedVesting from "../received-vesting";
import DropDown from "../dropdown";
import Transfer, {TransferMode, TransferAsset} from "../transfer";
import {error, success} from "../feedback";
import WalletMenu from "../wallet-menu";
import WithdrawRoutes from "../withdraw-routes";

import HiveEngineWallet from "../../helper/hive-engine-wallet";

import {getAccount, getConversionRequests} from "../../api/hive";

import {claimRewardBalance, formatError} from "../../api/operations";

import formattedNumber from "../../util/formatted-number";

import parseAsset from "../../helper/parse-asset";

import {_t} from "../../i18n";

import {plusCircle} from "../../img/svg";
import {resolveAny} from "dns";
import HiveWallet from "../../helper/hive-wallet";
import {LIQUID_TOKEN, LIQUID_TOKEN_UPPERCASE} from "../../../client_config";

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
    shortCoinName: string;
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
    };

    componentDidMount() {
        this.fetchConvertingAmount();
    }

    fetchConvertingAmount = () => {
        const {account} = this.props;

        getConversionRequests(account.name).then(r => {
            if (r.length === 0) {
                return;
            }

            let converting = 0;
            r.forEach(x => {
                converting += parseAsset(x.amount).amount;
            });

            this.stateSet({converting});
        });
    }

    toggleDelegatedList = () => {
        const {delegatedList} = this.state;
        this.stateSet({delegatedList: !delegatedList});
    };

    toggleReceivedList = () => {
        const {receivedList} = this.state;
        this.stateSet({receivedList: !receivedList});
    };

    toggleWithdrawRoutes = () => {
        const {withdrawRoutes} = this.state;
        this.stateSet({withdrawRoutes: !withdrawRoutes});
    }

    claimRewardBalance = () => {
        const {activeUser, updateActiveUser} = this.props;
        const {claiming} = this.state;

        if (claiming || !activeUser) {
            return;
        }

        this.stateSet({claiming: true});

        return getAccount(activeUser?.username!)
            .then(account => {
                const {
                    reward_hive_balance: hiveBalance = account.reward_hive_balance,
                    reward_hbd_balance: hbdBalance = account.reward_hbd_balance,
                    reward_vesting_balance: vestingBalance
                } = account;

                return claimRewardBalance(activeUser?.username!, hiveBalance!, hbdBalance!, vestingBalance!)
            }).then(() => getAccount(activeUser.username))
            .then(account => {
                success(_t('wallet.claim-reward-balance-ok'));
                this.stateSet({claiming: false, claimed: true});
                updateActiveUser(account);
            }).catch(err => {
                error(formatError(err));
                this.stateSet({claiming: false});
            })
    }

    openTransferDialog = (mode: TransferMode, asset: TransferAsset) => {
        this.stateSet({transfer: true, transferMode: mode, transferAsset: asset});
    }

    closeTransferDialog = () => {
        this.stateSet({transfer: false, transferMode: null, transferAsset: null});
    }

    render() {
        const {global, dynamicProps, account, activeUser, shortCoinName} = this.props;
        const {claiming, claimed, transfer, transferAsset, transferMode, converting} = this.state;

        if (!account.__loaded) {
            return null;
        }

        const {hivePerMVests} = dynamicProps;
        const isMyPage = activeUser && activeUser.username === account.name;
        const w = new HiveEngineWallet(account, dynamicProps, converting, shortCoinName);

        const balances = w.engineBalanceTable[this.props.shortCoinName];
        return (
            <div className="wallet-hive">

                <div className="wallet-main">
                    <div className="wallet-info">
                        {(false && w.hasUnclaimedRewards && !claimed) && (
                            <div className="unclaimed-rewards">
                                <div className="title">
                                    {_t('wallet.unclaimed-rewards')}
                                </div>
                                <div className="rewards">
                                    {w.rewardHiveBalance > 0 && (
                                        <span className="reward-type">{`${w.rewardHiveBalance} HIVE`}</span>
                                    )}
                                    {w.rewardHbdBalance > 0 && (
                                        <span className="reward-type">{`${w.rewardHbdBalance} HBD`}</span>
                                    )}
                                    {w.rewardVestingHive > 0 && (
                                        <span className="reward-type">{`${w.rewardVestingHive} HP`}</span>
                                    )}
                                    {isMyPage && (
                                        <Tooltip content={_t('wallet.claim-reward-balance')}>
                                            <a
                                                className={`claim-btn ${claiming ? 'in-progress' : ''}`}
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
                                <div className="description">{_t("wallet.estimated-description")}</div>
                            </div>
                            <div className="balance-values">
                                <div className="amount amount-bold">
                                    <FormattedCurrency {...this.props} value={w.estimatedValue} fixAt={3}/>
                                </div>
                            </div>
                        </div>

                        {w.engineBalanceTable && w.engineBalanceTable[this.props.shortCoinName] && <div className="balance-row">
                            <div className="balance-info">
                                <div className="title">{this.props.coinName}</div>
                                <div className="description">{_t("wallet." + this.props.shortCoinName + "-description")}</div>
                            </div>
                            <div className="balance-values">
                                <div className="amount">
                                    {(() => {
                                        if (isMyPage) {
                                            const dropDownConfig = {
                                                history: this.props.history,
                                                label: '',
                                                items: [

                                                    {
                                                        label: _t('wallet.transfer'),
                                                        onClick: () => {
                                                            this.openTransferDialog('transfer', this.props.shortCoinName);
                                                        }
                                                    },

                                                    {
                                                        label: _t('wallet.power-up'),
                                                        onClick: () => {
                                                            this.openTransferDialog('power-up', this.props.shortCoinName);
                                                        }
                                                    },

                                                ],
                                            };
                                            return <div className="amount-actions">
                                                <DropDown {...dropDownConfig} float="right"/>
                                            </div>;
                                        }
                                        return null;
                                    })()}

                                    <span>{formattedNumber(w.engineBalanceTable[this.props.shortCoinName].balance, {suffix: this.props.shortCoinName})}</span>
                                </div>
                            </div>

                        </div>}

                        {w.engineBalanceTable && balances && <div className="balance-row hive-power alternative">
                            <div className="balance-info">
                                <div className="title">{_t("wallet.staked", {c:this.props.coinName})}</div>
                                <div className="description">{_t("wallet.staked-" + this.props.shortCoinName + "-description")}</div>
                            </div>

                            <div className="balance-values">
                                <div className="amount">
                                    {(() => {
                                        if (isMyPage) {

                                            const dropDownConfig = {
                                                history: this.props.history,
                                                label: '',
                                                items: [
                                                    /*
                                                    {
                                                        label: _t('wallet.delegate'),
                                                        onClick: () => {
                                                            this.openTransferDialog('delegate', this.props.shortCoinName);
                                                        },
                                                    },
                                                    {
                                                        label: _t('wallet.power-down'),
                                                        onClick: () => {
                                                            this.openTransferDialog('power-down', this.props.shortCoinName);
                                                        },
                                                    },
                                                    {
                                                        label: _t('wallet.withdraw-routes'),
                                                        onClick: () => {
                                                            this.toggleWithdrawRoutes();
                                                        },
                                                    },

                                                     */
                                                ],
                                            };
                                            return <div className="amount-actions">
                                                <DropDown {...dropDownConfig} float="right"/>
                                            </div>;
                                        }
                                        return null;
                                    })()}
                                    {formattedNumber(balances.stake, {suffix: this.props.shortCoinName})}
                                </div>

                                {balances.delegationsOut > 0 && (
                                    <div className="amount amount-passive delegated-shares">
                                        <Tooltip content={_t("wallet.hive-power-delegated")}>
                                      <span className="amount-btn" onClick={this.toggleDelegatedList}>
                                        {formattedNumber(balances.delegationsOut, {suffix: this.props.shortCoinName})}
                                      </span>
                                        </Tooltip>
                                    </div>
                                )}

                                {(() => {
                                    if (balances.delegationsIn <= 0) {
                                        return null;
                                    }

                                    const strReceived = formattedNumber(balances.delegationsIn, {prefix: "+", suffix: this.props.shortCoinName});

                                    if (global.usePrivate) {
                                        return <div className="amount amount-passive received-shares">
                                            <Tooltip content={_t("wallet.hive-power-received")}>
                                                <span className="amount-btn" onClick={this.toggleReceivedList}>{strReceived}</span>
                                            </Tooltip>
                                        </div>;
                                    }

                                    return <div className="amount amount-passive received-shares">
                                        <Tooltip content={_t("wallet.hive-power-received")}>
                                            <span className="amount">{strReceived}</span>
                                        </Tooltip>
                                    </div>;
                                })()}

                                {balances.pendingUnstake > 0 && (
                                    <div className="amount amount-passive next-power-down-amount">
                                        <Tooltip content={_t("wallet.next-power-down-amount")}>
                                  <span>
                                    {formattedNumber(balances.pendingUnstake, {prefix: "-", suffix: this.props.shortCoinName})}
                                  </span>
                                        </Tooltip>
                                    </div>
                                )}

                                {(balances.delegationsOut > 0 || balances.delegationsIn > 0 || balances.pendingUnstake > 0) && (
                                    <div className="amount total-hive-power">
                                        <Tooltip content={_t("wallet.hive-power-total")}>
                                  <span>
                                    {formattedNumber(balances.pendingUnstake, {prefix: "=", suffix: this.props.shortCoinName})}
                                  </span>
                                        </Tooltip>
                                    </div>
                                )}
                            </div>
                        </div>}

                        
                        { // Commented out until we can put POB transactions in its place.
                        }
                        {// TransactionList({...this.props})
                        }
                    </div>
                    <WalletMenu global={global} username={account.name} active="hiveEngine"/>
                </div>

                {transfer && <Transfer {...this.props} activeUser={activeUser!}
                                       mode={transferMode!} asset={transferAsset!}
                                       LIQUID_TOKEN_balances={balances}
                                       LIQUID_TOKEN_precision={8}
                                       onHide={this.closeTransferDialog}/>}

                {this.state.delegatedList && (
                    <DelegatedVesting {...this.props} account={account} onHide={this.toggleDelegatedList}/>
                )}

                {this.state.receivedList && (
                    <ReceivedVesting {...this.props} account={account} onHide={this.toggleReceivedList}/>
                )}

                {this.state.withdrawRoutes && (
                    <WithdrawRoutes {...this.props} activeUser={activeUser!} onHide={this.toggleWithdrawRoutes}/>
                )}
            </div>
        );
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
    }

    return <WalletHiveEngine {...props} coinName={LIQUID_TOKEN} shortCoinName={LIQUID_TOKEN_UPPERCASE} />;
}
