// Directions on Hive Engine tokens are here.
// https://github.com/hive-engine/steemsmartcontracts-wiki/blob/master/Tokens-Contract.md
/*Saboin — Today at 8:07 PM
They are custom_json operations with the id ssc-mainnet-hive, and signed with the active key, so you put your account name in required_auths.
*/
import React, {Component} from "react";

import {PrivateKey} from "@hiveio/dhive";

import numeral from "numeral";

import moment from "moment";

import isEqual from "react-fast-compare";

import {Modal, Form, Row, Col, InputGroup, FormControl, Button} from "react-bootstrap";

import badActors from '@hiveio/hivescript/bad-actors.json';

import {Global} from "../../store/global/types";
import {DynamicProps} from "../../store/dynamic-props/types";
import {Account} from '../../store/accounts/types'
import {ActiveUser} from "../../store/active-user/types";
import {Transactions} from "../../store/transactions/types";

import BaseComponent from "../base";
import LinearProgress from "../linear-progress";
import UserAvatar from "../user-avatar";
import SuggestionList from "../suggestion-list";
import KeyOrHot from "../key-or-hot";
import {error} from "../feedback";

import HiveWallet from "../../helper/hive-wallet";
import amountFormatCheck from '../../helper/amount-format-check';
import parseAsset from "../../helper/parse-asset";
import {vestsToHp, hpToVests} from "../../helper/vesting";
import { LIQUID_TOKEN_UPPERCASE } from "../../../client_config";

import {getAccount} from "../../api/hive";
import {
    transfer,
    transferHot,
    transferKc,
    transferPoint,
    transferPointHot,
    transferPointKc,
    transferHiveEngineAsset,
    transferHiveEngineAssetKc,
    transferHiveEngineAssetHot,
    transferToSavings,
    transferToSavingsHot,
    transferToSavingsKc,
    transferFromSavings,
    transferFromSavingsHot,
    transferFromSavingsKc,
    transferToVesting,
    transferToVestingHot,
    transferToVestingKc,
    convert,
    convertHot,
    convertKc,
    delegateVestingShares,
    delegateVestingSharesHot,
    delegateVestingSharesKc,
    withdrawVesting,
    withdrawVestingHot,
    withdrawVestingKc,
    formatError
} from "../../api/operations";

import {_t} from "../../i18n";
import {Tsx} from "../../i18n/helper";

import {arrowRightSvg} from "../../img/svg";
import {getAccountHEFull, TokenBalance} from "../../api/hive-engine";
import HiveEngineWallet from "../../helper/hive-engine-wallet";

export type TransferMode = "transfer" | "transfer-saving" | "withdraw-saving" | "convert" | "power-up" | "power-down" | "delegate";
export type TransferAsset = string;// "HIVE" | "HBD" | "HP" | "POINT" | "POB" | ...

interface AssetSwitchProps {
    options: TransferAsset[];
    selected: TransferAsset;
    onChange: (i: TransferAsset) => void
}

class AssetSwitch extends Component<AssetSwitchProps> {
    clicked = (i: TransferAsset) => {
        this.setState({selected: i});
        const {onChange} = this.props;
        onChange(i);
    };

    render() {
        const {options, selected} = this.props;

        return (
            <div className="asset-switch">
                {options.map(opt =>
                    <a key={opt} onClick={() => this.clicked(opt)} className={`asset ${selected === opt ? 'selected' : ''}`}>{opt}</a>
                )}
            </div>
        );
    }
}

class FormText extends Component<{
    msg: string,
    type: "danger" | "warning" | "muted";
}> {
    render() {
        return <Row>
            <Col md={{span: 10, offset: 2}}>
                <Form.Text className={`text-${this.props.type} tr-form-text`}>{this.props.msg}</Form.Text>
            </Col>
        </Row>
    }
}

interface Props {
    global: Global;
    dynamicProps: DynamicProps;
    mode: TransferMode;
    asset: TransferAsset;
    to?: string;
    amount?: string;
    memo?: string;
    activeUser: ActiveUser;
    transactions: Transactions;
    signingKey: string;
    addAccount: (data: Account) => void;
    updateActiveUser: (data?: Account) => void;
    setSigningKey: (key: string) => void;
    onHide: () => void;
    LIQUID_TOKEN_balances?: TokenBalance;
    LIQUID_TOKEN_precision?: number;
}

interface State {
    step: 1 | 2 | 3 | 4;
    asset: TransferAsset;
    precision: number;
    to: string,
    toData: Account | null,
    toError: string,
    toWarning: string,
    amount: string,
    amountError: string;
    memo: string,
    inProgress: boolean;
}

const pureState = (props: Props): State => {
    let _to: string = "";
    let _toData: Account | null = null;
    const bare_liquid_token_precision: number =
        (LIQUID_TOKEN_UPPERCASE && props.LIQUID_TOKEN_precision) || 0;
    const liquid_token_precision = (bare_liquid_token_precision < 6) ? bare_liquid_token_precision : 6;
    const precision = props.asset === LIQUID_TOKEN_UPPERCASE ? liquid_token_precision : 3;
    const satoshi = precision ? ("0." + "0".repeat(precision-1) + "1") : "1";
    if (["transfer-saving", "withdraw-saving", "convert", "power-up", "power-down"].includes(props.mode)) {
        _to = props.activeUser.username;
        _toData = props.activeUser.data
    }

    return {
        step: 1,
        asset: props.asset,
        precision,
        to: props.to || _to,
        toData: props.to ? {name: props.to} : _toData,
        toError: "",
        toWarning: "",
        amount: props.amount || satoshi,
        amountError: "",
        memo: props.memo || "",
        inProgress: false
    }
}

export class Transfer extends BaseComponent<Props, State> {
    state: State = pureState(this.props);

    _timer: any = null;

    componentDidMount() {
        this.checkAmount();

        const {updateActiveUser} = this.props;
        updateActiveUser();
    }

    componentDidUpdate(prevProps: Readonly<Props>) {
        if (!isEqual(this.props.activeUser, prevProps.activeUser)) {
            this.checkAmount();
        }
    }

    formatNumber = (num: number | string, precision: number) => {
        const format = `0.${"0".repeat(precision)}`;

        return numeral(num).format(format, Math.floor) // round to floor
    }

    assetChanged = (asset: TransferAsset) => {
        this.stateSet({asset}, () => {
            this.checkAmount();
        });
    };

    toChanged = (e: React.ChangeEvent<FormControl & HTMLInputElement>) => {
        const {value: to} = e.target;
        this.stateSet({to}, this.handleTo);
    };

    toSelected = (to: string) => {
        this.stateSet({to}, this.handleTo);
    }

    amountChanged = (e: React.ChangeEvent<FormControl & HTMLInputElement>): void => {
        const {value: amount} = e.target;
        this.stateSet({amount}, () => {
            this.checkAmount();
        });
    };

    memoChanged = (e: React.ChangeEvent<FormControl & HTMLInputElement>): void => {
        const {value: memo} = e.target;
        this.stateSet({memo});
    };

    handleTo = () => {
        const {to} = this.state;

        if (this._timer) {
            clearTimeout(this._timer);
        }

        if (to === '') {
            this.stateSet({toWarning: '', toError: '', toData: null});
            return;
        }

        this._timer = setTimeout(() => {
            if (to === 'deepcrypto8') {
            	this.stateSet({toWarning: "This exchange has a history of not refunding users' funds!"});
            	return;
            } else if (badActors.includes(to)) {
                this.stateSet({toWarning: _t("transfer.to-bad-actor")});
            } else {
                this.stateSet({toWarning: ''});
            }

            this.stateSet({inProgress: true, toData: null});

            return getAccount(to)
                .then(resp => {
                    if (resp) {
                        this.stateSet({toError: '', toData: resp});
                    } else {
                        this.stateSet({
                            toError: _t("transfer.to-not-found")
                        });
                    }

                    return resp;
                })
                .catch(err => {
                    error(formatError(err));
                })
                .finally(() => {
                    this.stateSet({inProgress: false});
                });
        }, 500);
    }

    checkAmount = () => {
        const {amount, asset} = this.state;


        if (amount === '') {
            this.stateSet({amountError: ''});
            return;
        }

        if (!amountFormatCheck(amount)) {
            this.stateSet({amountError: _t("transfer.wrong-amount")});
            return;
        }

        const dotParts = amount.split('.');
        if (dotParts.length > 1) {
            const precision = dotParts[1];
            const maxAllowedPrecision = (asset === LIQUID_TOKEN_UPPERCASE ? (this.props.LIQUID_TOKEN_precision || 3) : 3);
            if ((precision.length > maxAllowedPrecision)) {
                this.stateSet({amountError: _t("transfer.amount-precision-error", {p: maxAllowedPrecision})});
                return;
            }
        }

        if (parseFloat(amount) > this.getBalance()) {
            this.stateSet({amountError: _t("trx-common.insufficient-funds")});
            return;
        }

        this.stateSet({amountError: ''});
    };

    copyBalance = () => {
        const amount = this.formatBalance(this.getBalance());
        this.stateSet({amount}, () => {
            this.checkAmount();
        });
    };

    getBalance = (): number => {
        const {mode, activeUser, dynamicProps} = this.props;
        const {LIQUID_TOKEN_balances} = this.props;
        const {asset} = this.state;

        if (asset === 'POINT') {
            return parseAsset(activeUser.points.points).amount;
        }

        const w = new HiveEngineWallet(activeUser.data, dynamicProps, 0, LIQUID_TOKEN_UPPERCASE);
        console.log(w);
        if (mode === "withdraw-saving") {
            return asset === "HIVE" ? w.savingBalance : w.savingBalanceHbd;
        }

        if (asset === "HIVE") {
            return w.balance;
        }

        if (asset === "HBD") {
            return w.hbdBalance;
        }

        if (asset === "HP") {
            const {hivePerMVests} = dynamicProps;
            const vestingShares = w.vestingSharesAvailable;
            return vestsToHp(vestingShares, hivePerMVests);
        }


        if (asset === LIQUID_TOKEN_UPPERCASE) {
            if (!!LIQUID_TOKEN_balances) {
                return LIQUID_TOKEN_balances.balance;
            }
        }

        return 0;
    };

    // This craps out for 0.000,000,1 and less.  What to do?
    formatBalance = (balance: number): string => {
        const {asset} = this.state;
        let try_this = this.formatNumber(balance,
            (asset === LIQUID_TOKEN_UPPERCASE ? (this.props.LIQUID_TOKEN_precision || 3) : 3));
        if (isNaN(parseFloat(try_this))) {
            try_this = "0.000&numsp;000&numsp;01";
        }
        return try_this;
    };

    hpToVests = (hp: number): string => {
        const {dynamicProps} = this.props;
        const {hivePerMVests} = dynamicProps;
        const vests = hpToVests(hp, hivePerMVests);

        return `${this.formatNumber(vests, 6)} VESTS`;
    }

    canSubmit = () => {
        const {toData, toError, amountError, inProgress, amount} = this.state;
        return toData && !toError && !amountError && !inProgress && parseFloat(amount) > 0;
    };

    next = () => {
        // make sure 3 decimals in amount
        const {amount, asset} = this.state;
        const fixedAmount = this.formatNumber(amount, (asset === LIQUID_TOKEN_UPPERCASE ? (this.props.LIQUID_TOKEN_precision || 3) : 3));

        this.stateSet({step: 2, amount: fixedAmount});
    };

    nextPowerDown = () => {
        this.stateSet({step: 2, amount: "0.000"});
    }

    back = () => {
        this.stateSet({step: 1});
    };

    confirm = () => {
        this.stateSet({step: 3});
    }

    sign = (key: PrivateKey) => {
        const {activeUser, mode} = this.props;
        const {to, amount, asset, memo} = this.state;
        const fullAmount = `${amount} ${asset}`;
        const username = activeUser?.username!

        let promise: Promise<any>;
        switch (mode) {
            case "transfer": {
                if (asset === "POINT") {
                    promise = transferPoint(username, key, to, fullAmount, memo);
                } else if (["HBD","HIVE"].includes(asset)) {
                    promise = transfer(username, key, to, fullAmount, memo);
                } else {
                	promise = transferHiveEngineAsset(username, key, to, fullAmount, memo);
                }
                break;
            }
            case "transfer-saving": {
                promise = transferToSavings(username, key, to, fullAmount, memo);
                break;
            }
            case "convert": {
                promise = convert(username, key, fullAmount)
                break;
            }
            case "withdraw-saving": {
                promise = transferFromSavings(username, key, to, fullAmount, memo);
                break;
            }
            case "power-up": {
                promise = transferToVesting(username, key, to, fullAmount);
                break;
            }
            case "power-down": {
                const vests = this.hpToVests(Number(amount));
                promise = withdrawVesting(username, key, vests);
                break;
            }
            case "delegate": {
                const vests = this.hpToVests(Number(amount));
                promise = delegateVestingShares(username, key, to, vests);
                break;
            }
            default:
                return;
        }

        this.stateSet({inProgress: true});

        promise.then(() => getAccountHEFull(activeUser.username, true))
            .then((a) => {
                const {addAccount, updateActiveUser} = this.props;
                // refresh
                addAccount(a);
                // update active
                updateActiveUser(a);
                this.stateSet({step: 4, inProgress: false});
            })
            .catch(err => {
                error(formatError(err));
                this.stateSet({inProgress: false});
            });
    }

    signHs = () => {
        const {activeUser, mode, onHide} = this.props;
        const {to, amount, asset, memo} = this.state;
        const fullAmount = `${amount} ${asset}`;
        const username = activeUser?.username!

        switch (mode) {
            case "transfer": {
                if (asset === "POINT") {
                    transferPointHot(username, to, fullAmount, memo);
                } else if (["HBD","HIVE"].includes(asset)) {
                    transferHot(username, to, fullAmount, memo);
                } else {
                	transferHiveEngineAssetHot(username, to, fullAmount, memo);
                }
                break;
            }
            case "transfer-saving": {
                transferToSavingsHot(username, to, fullAmount, memo);
                break;
            }
            case "convert": {
                convertHot(username, fullAmount)
                break;
            }
            case "withdraw-saving": {
                transferFromSavingsHot(username, to, fullAmount, memo);
                break;
            }
            case "power-up": {
                transferToVestingHot(username, to, fullAmount);
                break;
            }
            case "power-down": {
                const vests = this.hpToVests(Number(amount));
                withdrawVestingHot(username, vests);
                break;
            }
            case "delegate": {
                const vests = this.hpToVests(Number(amount));
                delegateVestingSharesHot(username, to, vests);
                break;
            }
            default:
                return;
        }

        onHide();
    }

    signKs = () => {
        const {activeUser, mode} = this.props;
        const {to, amount, asset, memo} = this.state;
        const fullAmount = `${amount} ${asset}`;
        const username = activeUser?.username!

        let promise: Promise<any>;
        switch (mode) {
            case "transfer": {
                if (asset === "POINT") {
                    promise = transferPointKc(username, to, fullAmount, memo);
                } else if (["HBD","HIVE"].includes(asset)) {
                    promise = transferKc(username, to, fullAmount, memo);
                } else {
                	promise = transferHiveEngineAssetKc(username, to, fullAmount, memo);
                }
                break;
            }
            case "transfer-saving": {
                promise = transferToSavingsKc(username, to, fullAmount, memo);
                break;
            }
            case "convert": {
                promise = convertKc(username, fullAmount)
                break;
            }
            case "withdraw-saving": {
                promise = transferFromSavingsKc(username, to, fullAmount, memo);
                break;
            }
            case "power-up": {
                promise = transferToVestingKc(username, to, fullAmount);
                break;
            }
            case "power-down": {
                const vests = this.hpToVests(Number(amount));
                promise = withdrawVestingKc(username, vests);
                break;
            }
            case "delegate": {
                const vests = this.hpToVests(Number(amount));
                promise = delegateVestingSharesKc(username, to, vests);
                break;
            }
            default:
                return;
        }

        this.stateSet({inProgress: true});
        promise.then(() => getAccountHEFull(activeUser.username, true))
            .then((a) => {
                const {addAccount, updateActiveUser} = this.props;
                // refresh
                addAccount(a);
                // update active
                updateActiveUser(a);
                this.stateSet({step: 4, inProgress: false});
            })
            .catch(err => {
                error(formatError(err));
                this.stateSet({inProgress: false});
            });
    }

    finish = () => {
        const {onHide} = this.props;
        onHide();
    }

    reset = () => {
        this.stateSet(pureState(this.props));
    }

    render() {
        const {global, mode, activeUser, transactions, dynamicProps} = this.props;
        const {step, asset, to, toError, toWarning, amount, amountError, memo, inProgress} = this.state;

        const recent = [...new Set(
            transactions.list
                .filter(x => x.type === 'transfer' && x.from === activeUser.username)
                .map(x => x.type === 'transfer' ? x.to : '')
                .filter(x => {
                    if (to.trim() === '') {
                        return true;
                    }

                    return x.indexOf(to) !== -1;
                })
                .reverse()
                .slice(0, 5)
        )]

        const suggestionProps = {
            header: _t('transfer.recent-transfers'),
            renderer: (i: string) => {
                return <>{UserAvatar({...this.props, username: i, size: "medium"})} <span style={{marginLeft: '4px'}}>{i}</span></>;
            },
            onSelect: this.toSelected,
        };

        let assets: TransferAsset[] = [];
        switch (mode) {
            case "transfer":
                if (global.usePrivate) {
                    assets = ["HIVE", "HBD", "POINT", LIQUID_TOKEN_UPPERCASE];
                } else {
                    assets = ["HIVE", "HBD", LIQUID_TOKEN_UPPERCASE];
                }
                break;
            case "transfer-saving":
            case "withdraw-saving":
                assets = ["HIVE", "HBD"];
                break;
            case "convert":
                assets = ["HBD"];
                break;
            case "power-up":
                assets = ["HIVE", LIQUID_TOKEN_UPPERCASE];
                break;
            case "power-down":
            case "delegate":
                assets = ["HP", LIQUID_TOKEN_UPPERCASE + ' Power'];
                break;

        }

        const showTo = ["transfer", "transfer-saving", "withdraw-saving", "power-up", "delegate"].includes(mode);
        const showMemo = ["transfer", "transfer-saving", "withdraw-saving"].includes(mode);

        const balance = this.formatBalance(this.getBalance());

        const titleLngKey = (mode === "transfer" && asset === "POINT") ? _t("transfer-title-point") : `${mode}-title`;
        const subTitleLngKey = `${mode}-sub-title`;
        const summaryLngKey = `${mode}-summary`;

        const formHeader1 = <div className="transaction-form-header">
            <div className="step-no">1</div>
            <div className="box-titles">
                <div className="main-title">{_t(`transfer.${titleLngKey}`)}</div>
                <div className="sub-title">{_t(`transfer.${subTitleLngKey}`)}</div>
            </div>
        </div>;

        const formHeader2 = <div className="transaction-form-header">
            <div className="step-no">2</div>
            <div className="box-titles">
                <div className="main-title">
                    {_t('transfer.confirm-title')}
                </div>
                <div className="sub-title">
                    {_t('transfer.confirm-sub-title')}
                </div>
            </div>
        </div>;

        const formHeader3 = <div className="transaction-form-header">
            <div className="step-no">3</div>
            <div className="box-titles">
                <div className="main-title">
                    {_t('trx-common.sign-title')}
                </div>
                <div className="sub-title">
                    {_t('trx-common.sign-sub-title')}
                </div>
            </div>
        </div>;

        const formHeader4 = <div className="transaction-form-header">
            <div className="step-no">4</div>
            <div className="box-titles">
                <div className="main-title">
                    {_t('trx-common.success-title')}
                </div>
                <div className="sub-title">
                    {_t('trx-common.success-sub-title')}
                </div>
            </div>
        </div>;

        // Powering down
        if (step === 1 && mode === "power-down") {
            const w = new HiveWallet(activeUser.data, dynamicProps);
            if (w.isPoweringDown) {
                return <div className="transfer-dialog-content">
                    <div className="transaction-form">
                        {formHeader1}
                        <div className="transaction-form-body powering-down">
                            <p>{_t("transfer.powering-down")}</p>
                            <p> {_t("wallet.next-power-down", {
                                time: moment(w.nextVestingWithdrawalDate).fromNow(),
                                amount: `${this.formatNumber(w.nextVestingSharesWithdrawalHive, (asset === LIQUID_TOKEN_UPPERCASE ? (this.props.LIQUID_TOKEN_precision || 3) : 3))} HIVE`,
                            })}</p>
                            <p>
                                <Button onClick={this.nextPowerDown} variant="danger">{_t("transfer.stop-power-down")}</Button>
                            </p>
                        </div>
                    </div>
                </div>
            }
        }

        return <div className="transfer-dialog-content">
            {step === 1 && (
                <div className={`transaction-form ${inProgress ? 'in-progress' : ''}`}>
                    {formHeader1}
                    {inProgress && <LinearProgress/>}
                    <Form className="transaction-form-body">
                        <Form.Group as={Row}>
                            <Form.Label column={true} sm="2">
                                {_t("transfer.from")}
                            </Form.Label>
                            <Col sm="10">
                                <InputGroup>
                                    <InputGroup.Prepend>
                                        <InputGroup.Text>@</InputGroup.Text>
                                    </InputGroup.Prepend>
                                    <Form.Control value={activeUser.username} readOnly={true}/>
                                </InputGroup>
                            </Col>
                        </Form.Group>

                        {showTo && (
                            <>
                                <Form.Group as={Row}>
                                    <Form.Label column={true} sm="2">
                                        {_t("transfer.to")}
                                    </Form.Label>
                                    <Col sm="10">
                                        <SuggestionList items={recent} {...suggestionProps}>
                                            <InputGroup>
                                                <InputGroup.Prepend>
                                                    <InputGroup.Text>@</InputGroup.Text>
                                                </InputGroup.Prepend>
                                                <Form.Control
                                                    type="text"
                                                    autoFocus={to === ''}
                                                    placeholder={_t("transfer.to-placeholder")}
                                                    value={to}
                                                    onChange={this.toChanged}
                                                    className={toError ? "is-invalid" : ""}
                                                />
                                            </InputGroup>
                                        </SuggestionList>
                                    </Col>
                                </Form.Group>
                                {toWarning && (
                                    <FormText msg={toWarning} type="danger"/>
                                )}
                                {toError && (
                                    <FormText msg={toError} type="danger"/>
                                )}
                            </>
                        )}

                        <Form.Group as={Row}>
                            <Form.Label column={true} sm="2">
                                {_t("transfer.amount")}
                            </Form.Label>
                            <Col sm="10" className="d-flex align-items-center">
                                <InputGroup>
                                    <InputGroup.Prepend>
                                        <InputGroup.Text>#</InputGroup.Text>
                                    </InputGroup.Prepend>
                                    <Form.Control
                                        type="text"
                                        placeholder={_t("transfer.amount-placeholder")}
                                        value={amount}
                                        onChange={this.amountChanged}
                                        className={amountError ? "is-invalid" : ""}
                                        autoFocus={(mode !== 'transfer')}
                                    />
                                </InputGroup>
                                {assets.length > 1 && (
                                    <AssetSwitch
                                        options={assets}
                                        selected={asset}
                                        onChange={this.assetChanged}
                                    />
                                )}
                            </Col>
                        </Form.Group>

                        {amountError && (<FormText msg={amountError} type="danger"/>)}

                        <Row>
                            <Col lg={{span: 10, offset: 2}}>
                                <div className="balance">
                                    <span className="balance-label">{_t("transfer.balance")}{": "}</span>
                                    <span className="balance-num" onClick={this.copyBalance}>{balance}{" "}{asset}</span>
                                    {asset === "HP" && (<div className="balance-hp-hint">{_t("transfer.available-hp-hint")}</div>)}
                                </div>
                                {(() => {
                                    if (mode === "power-down") {
                                        const hive = Math.round((Number(amount) / 13) * 1000) / 1000;
                                        if (!isNaN(hive) && hive > 0) {
                                            return <div className="power-down-estimation">
                                                {_t("transfer.power-down-estimated", {n: `${this.formatNumber(hive, (asset === LIQUID_TOKEN_UPPERCASE ? (this.props.LIQUID_TOKEN_precision || 3) : 3))} HIVE`})}
                                            </div>;
                                        }
                                    }
                                    return null;
                                })()}
                            </Col>
                        </Row>

                        {showMemo && (
                            <>
                                <Form.Group as={Row}>
                                    <Form.Label column={true} sm="2">
                                        {_t("transfer.memo")}
                                    </Form.Label>
                                    <Col sm="10">
                                        <Form.Control
                                            placeholder={_t("transfer.memo-placeholder")}
                                            value={memo}
                                            onChange={this.memoChanged}
                                        />
                                    </Col>
                                </Form.Group>
                                <FormText msg={_t("transfer.memo-help")} type="muted"/>
                            </>
                        )}

                        <Form.Group as={Row}>
                            <Col sm={{span: 10, offset: 2}}>
                                <Button onClick={this.next} disabled={!this.canSubmit()}>{_t('g.next')}</Button>
                            </Col>
                        </Form.Group>
                    </Form>
                </div>
            )}

            {step === 2 && (
                <div className="transaction-form">
                    {formHeader2}
                    <div className="transaction-form-body">
                        <div className="confirmation">
                            <div className="confirm-title">{_t(`transfer.${titleLngKey}`)}</div>
                            <div className="users">
                                <div className="from-user">
                                    {UserAvatar({...this.props, username: activeUser.username, size: "medium"})}
                                </div>
                                {showTo && (
                                    <>
                                        <div className="arrow">{arrowRightSvg}</div>
                                        <div className="to-user">
                                            {UserAvatar({...this.props, username: to, size: "medium"})}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="amount">
                                {amount} {asset}
                            </div>
                            {asset === "HP" && <div className="amount-vests">{this.hpToVests(Number(amount))}</div>}
                            {memo && <div className="memo">{memo}</div>}

                        </div>
                        <div className="d-flex justify-content-center">
                            <Button variant="outline-secondary" disabled={inProgress} onClick={this.back}>
                                {_t("g.back")}
                            </Button>
                            <span className="hr-6px-btn-spacer"/>
                            <Button disabled={inProgress} onClick={this.confirm}>
                                {inProgress && (
                                    <span>spinner</span>
                                )}
                                {_t("transfer.confirm")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="transaction-form">
                    {formHeader3}
                    <div className="transaction-form">
                        {KeyOrHot({
                            ...this.props,
                            inProgress,
                            onKey: this.sign,
                            onHot: this.signHs,
                            onKc: this.signKs
                        })}
                        <p className="text-center">
                            <a href="#" onClick={(e) => {
                                e.preventDefault();

                                this.stateSet({step: 2});
                            }}>{_t("g.back")}</a>
                        </p>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="transaction-form">
                    {formHeader4}
                    <div className="transaction-form-body">
                        <Tsx k={`transfer.${summaryLngKey}`} args={{amount: `${amount} ${asset}`, from: activeUser.username, to}}>
                            <div className="success"/>
                        </Tsx>
                        <div className="d-flex justify-content-center">
                            <Button variant="outline-secondary" onClick={this.reset}>
                                {_t("transfer.reset")}
                            </Button>
                            <span className="hr-6px-btn-spacer"/>
                            <Button onClick={this.finish}>
                                {_t("g.finish")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    }
}

export default class TransferDialog extends Component<Props> {
    render() {
        const {onHide} = this.props;
        return (
            <Modal animation={false} show={true} centered={true} onHide={onHide} keyboard={false} className="transfer-dialog modal-thin-header" size="lg">
                <Modal.Header closeButton={true}/>
                <Modal.Body>
                    <Transfer {...this.props} />
                </Modal.Body>
            </Modal>
        );
    }
}
