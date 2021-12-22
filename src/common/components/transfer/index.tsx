// Directions on Hive Engine tokens are here.
// https://github.com/hive-engine/steemsmartcontracts-wiki/blob/master/Tokens-Contract.md
/*Saboin — Today at 8:07 PM
They are custom_json operations with the id ssc-mainnet-hive, and signed with the active key, so you put your account name in required_auths.
*/
import React, { Component } from "react";
import { PrivateKey } from "@hiveio/dhive";
import numeral from "numeral";
import moment from "moment";
import isEqual from "react-fast-compare";
import {
  Modal,
  Form,
  Row,
  Col,
  InputGroup,
  FormControl,
  Button,
} from "react-bootstrap";
import badActors from "@hiveio/hivescript/bad-actors.json";
import formattedNumber from "../../util/formatted-number";
import { Global } from "../../store/global/types";
import { DynamicProps } from "../../store/dynamic-props/types";
import { Account } from "../../store/accounts/types";
import { ActiveUser } from "../../store/active-user/types";
import { Transactions } from "../../store/transactions/types";
import BaseComponent from "../base";
import LinearProgress from "../linear-progress";
import UserAvatar from "../user-avatar";
import SuggestionList from "../suggestion-list";
import KeyOrHot from "../key-or-hot";
import { error } from "../feedback";
import HiveWallet from "../../helper/hive-wallet";
import amountFormatCheck from "../../helper/amount-format-check";
import parseAsset from "../../helper/parse-asset";
import { vestsToHp, hpToVests } from "../../helper/vesting";
import FormattedNumber from "../../util/formatted-number";
import {
  getFeedHistory,
  getAccount,
  HIVE_API_NAME,
  DOLLAR_API_NAME,
  estimateHiveCollateral,
  HIVE_CONVERSION_COLLATERAL_RATIO,
} from "../../api/hive";
import Tooltip from "../tooltip";
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
  collateralizedConvert,
  collateralizedConvertHot,
  collateralizedConvertKc,
  delegateVestingShares,
  delegateVestingSharesHot,
  delegateVestingSharesKc,
  withdrawVesting,
  withdrawVestingHot,
  withdrawVestingKc,
  cancelWithdrawVesting,
  cancelWithdrawVestingHot,
  cancelWithdrawVestingKc,
  formatError,
} from "../../api/operations";
import { _t } from "../../i18n";
import { Tsx } from "../../i18n/helper";
import { arrowRightSvg } from "../../img/svg";
import {
  getAccountHEFull,
  TokenBalance,
  UnStake,
  is_FullHiveEngineAccount,
  is_not_FullHiveEngineAccount,
  FullHiveEngineAccount,
} from "../../api/hive-engine";
import HiveEngineWallet from "../../helper/hive-engine-wallet";
import {
  HIVE_ENGINE_TOKENS,
  LIQUID_TOKEN_UPPERCASE,
  VESTING_TOKEN,
} from "../../../client_config";
export type TransferMode =
  | "borrow"
  | "transfer"
  | "transfer-saving"
  | "withdraw-saving"
  | "convert"
  | "power-up"
  | "power-down"
  | "delegate";
export type TransferAsset = string; // "HIVE" | DOLLAR_API_NAME | "HP" | "POINT" | "POB" | ...
const NATIVE_PD_ASSET = "HP";
interface AssetSwitchProps {
  options: TransferAsset[];
  selected: TransferAsset;
  onChange: (i: TransferAsset) => void;
}
class AssetSwitch extends Component<AssetSwitchProps> {
  clicked = (i: TransferAsset) => {
    this.setState({ selected: i });
    const { onChange } = this.props;
    onChange(i);
  };
  render() {
    const { options, selected } = this.props;
    return (
      <div className="asset-switch">
        {options.map((opt) => (
          <a
            key={opt}
            onClick={() => this.clicked(opt)}
            className={`asset ${selected === opt ? "selected" : ""}`}
          >
            {opt}
          </a>
        ))}
      </div>
    );
  }
}
class FormText extends Component<{
  msg: string;
  type: "danger" | "warning" | "muted";
}> {
  render() {
    return (
      <Row>
        <Col md={{ span: 10, offset: 2 }}>
          <Form.Text className={`text-${this.props.type} tr-form-text`}>
            {this.props.msg}
          </Form.Text>
        </Col>
      </Row>
    );
  }
}
import { HiveEngineStaticInfo } from "../../store/hive-engine-tokens/types";

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
  hiveEngineTokens: Array<HiveEngineStaticInfo>;
  LIQUID_TOKEN_balances?: TokenBalance;
  LIQUID_TOKEN_precision?: number;
}
interface State {
  step: 1 | 2 | 3 | 4;
  asset: TransferAsset;
  precision: number;
  to: string;
  toData: Account | null;
  toError: string;
  toWarning: string;
  amount: string;
  amountError: string;
  memo: string;
  inProgress: boolean;
  estimatedRequiredHiveCollateral: number;
}
const pureState = (props: Props): State => {
  const { global, activeUser, asset, LIQUID_TOKEN_precision } = props;
  let _to: string = "";
  let _toData: Account | null = null;
  const { hiveEngineTokensProperties } = global;
  console.log({ props });

  if (
    [
      "transfer-saving",
      "withdraw-saving",
      "convert",
      "power-up",
      "power-down",
      "borrow",
    ].includes(props.mode)
  ) {
    _to = props.activeUser.username;
    _toData = props.activeUser.data;
  }

  console.log({ LIQUID_TOKEN_precision });

  return {
    step: 1,
    asset: props.asset,
    precision: LIQUID_TOKEN_precision ?? 8,
    to: props.to || _to,
    toData: props.to ? { name: props.to } : _toData,
    toError: "",
    toWarning: "",
    amount: props.amount || "",
    amountError: "",
    memo: props.memo || "",
    estimatedRequiredHiveCollateral: 0,
    inProgress: false,
  };
};
export class Transfer extends BaseComponent<Props, State> {
  state: State = pureState(this.props);
  _timer: any = null;
  componentDidMount() {
    this.checkAmount();
    const { updateActiveUser } = this.props;
    updateActiveUser();
  }
  componentDidUpdate(prevProps: Readonly<Props>) {
    if (!isEqual(this.props.activeUser, prevProps.activeUser)) {
      this.checkAmount();
    }
  }
  getPrecision = (asset: string) => {
    const { global } = this.props;
    const hiveEngineTokensProperties = global.hiveEngineTokensProperties;
    if (asset == HIVE_API_NAME || asset === DOLLAR_API_NAME || asset == "HP") {
      return 3;
    } else if (asset == "VESTS") {
      return 6;
    }

    if (hiveEngineTokensProperties) {
      const hiveETP = hiveEngineTokensProperties[asset];
      if (hiveETP) {
        if (hiveETP.info) {
          return hiveETP.info.precision ?? 8;
        }
      }
    }
    return 8;
  };

  // for sending to APIs and such
  formatNumber = (num: number | string, precision: number): string => {
    if (typeof num === "string") return this.parseFloat(num).toFixed(precision);
    return num.toFixed(precision);
  };
  assetChanged = (asset: TransferAsset) => {
    this.stateSet({ asset }, () => {
      this.checkAmount();
    });
  };
  toChanged = (e: React.ChangeEvent<typeof FormControl & HTMLInputElement>) => {
    const { value: to } = e.target;
    this.stateSet({ to }, this.handleTo);
  };
  toSelected = (to: string) => {
    this.stateSet({ to }, this.handleTo);
  };
  amountChanged = (
    e: React.ChangeEvent<typeof FormControl & HTMLInputElement>
  ): void => {
    const { value: amount } = e.target;
    this.stateSet({ amount }, () => {
      this.checkAmount();
    });
  };
  memoChanged = (
    e: React.ChangeEvent<typeof FormControl & HTMLInputElement>
  ): void => {
    const { value: memo } = e.target;
    this.stateSet({ memo });
  };
  handleTo = () => {
    const { to } = this.state;
    if (this._timer) {
      clearTimeout(this._timer);
    }
    if (to === "") {
      this.stateSet({ toWarning: "", toError: "", toData: null });
      return;
    }
    this._timer = setTimeout(() => {
      if (to === "deepcrypto8") {
        this.stateSet({
          toWarning:
            "This exchange has a history of not refunding users' funds!",
        });
        return;
      } else if (badActors.includes(to)) {
        this.stateSet({ toWarning: _t("transfer.to-bad-actor") });
      } else {
        this.stateSet({ toWarning: "" });
      }
      this.stateSet({ inProgress: true, toData: null });
      return getAccount(to)
        .then((resp) => {
          if (resp) {
            this.stateSet({ toError: "", toData: resp });
          } else {
            this.stateSet({
              toError: _t("transfer.to-not-found"),
            });
          }
          return resp;
        })
        .catch((err) => {
          error(formatError(err));
        })
        .finally(() => {
          this.stateSet({ inProgress: false });
        });
    }, 500);
  };
  maximumFractionalDigits(): number {
    const { asset } = this.state;
    const { global } = this.props;
    const { hiveEngineTokensProperties } = global;
    try {
      let x = hiveEngineTokensProperties,
        y,
        z;
      if (x && (y = x[asset]) && (z = y.info)) return z.precision ?? 0;
    } catch (e) {}
    return 0;
  }
  checkAmount = () => {
    const { mode, activeUser, dynamicProps } = this.props;
    const { asset } = this.state;
    const precision = this.getPrecision(asset);
    const raw_amount = this.state.amount;
    const raw_length = raw_amount.length;
    const amount = raw_amount.replace(/,/g, "");
    if (amount === "") {
      this.stateSet({ amountError: "", precision });
      return;
    }
    if (!amountFormatCheck(amount)) {
      this.stateSet({ amountError: _t("transfer.wrong-amount"), precision });
      return;
    }
    const dotParts = amount.split(".");
    if (dotParts.length > 1) {
      if (dotParts[1].length > precision) {
        this.stateSet({
          amountError: _t("transfer.amount-precision-error", { p: precision }),
          precision,
        });
        return;
      }
    }
    if (raw_amount.indexOf(",") != -1) {
      // dp is the position of the decimal point or the length of raw_length if there is no decimal point.
      const dp = (raw_amount.indexOf(".") + raw_length + 1) % (raw_length + 1);
      const dp_4 = dp % 4;
      for (let i = 0; i < raw_amount.length; ++i) {
        if (i == dp) continue;
        if ((i % 4 == dp_4) != (raw_amount.charAt(i) == ",")) {
          this.stateSet({
            amountError: _t("transfer.wrong-amount"),
            precision,
          });
          return;
        }
      }
    }
    if (parseFloat(amount) > this.getBalance() && this.props.mode != "borrow") {
      this.stateSet({
        amountError: _t("trx-common.insufficient-funds"),
        precision,
      });
      return;
    }
    const stateSet = this.stateSet.bind(this);
    if (this.props.mode === "borrow") {
      estimateHiveCollateral(parseFloat(amount)).then((amount) => {
        const w = new HiveEngineWallet(activeUser.data, dynamicProps, 0, asset);
        if (amount > w.balance) {
          stateSet({
            estimatedRequiredHiveCollateral: amount,
            amountError: _t("trx-common.insufficient-funds"),
            precision,
          });
        } else {
          stateSet({
            estimatedRequiredHiveCollateral: amount,
            amountError: "",
            precision,
          });
        }
      });
    } else {
      this.stateSet({ amountError: "", precision });
    }
  };
  copyBalance = () => {
    const amount = this.formatBalance(this.getBalance());
    this.stateSet({ amount }, () => {
      this.checkAmount();
    });
  };
  getBalance = (): number => {
    const { mode, activeUser, dynamicProps } = this.props;
    const { asset } = this.state;
    let x;
    const balances =
      ((x = activeUser.data) &&
        (x = (x as FullHiveEngineAccount).token_balances) &&
        x.find((x) => x.symbol === asset)) ||
      null;
    if (asset === "POINT") {
      return parseAsset(activeUser.points.points).amount;
    }
    const w = new HiveEngineWallet(
      activeUser.data,
      dynamicProps,
      0,
      LIQUID_TOKEN_UPPERCASE
    );
    if (mode === "withdraw-saving") {
      return asset === HIVE_API_NAME ? w.savingBalance : w.savingBalanceHbd;
    }
    if (asset === HIVE_API_NAME) {
      return w.balance;
    }
    if (asset === DOLLAR_API_NAME) {
      return w.hbdBalance;
    }
    if (asset === "HP") {
      const { hivePerMVests } = dynamicProps;
      const vestingShares = w.vestingSharesAvailable;
      return vestsToHp(vestingShares, hivePerMVests);
    }
    if (asset !== VESTING_TOKEN) {
      if (!!balances) {
        return balances.balance;
      }
    }
    if (asset === VESTING_TOKEN) {
      if (!!balances) {
        return balances.stake;
      }
    }
    return 0;
  };
  formatBalance = (balance: number): string => {
    const { asset, precision } = this.state;
    let try_this = formattedNumber(balance, { fractionDigits: precision });
    return try_this;
  };
  hpToVests = (hp: number): string => {
    const { dynamicProps } = this.props;
    const { hivePerMVests } = dynamicProps;
    const vests = hpToVests(hp, hivePerMVests);
    return `${this.formatNumber(vests, 6)} VESTS`;
  };
  canSubmit = () => {
    const { toData, toError, amountError, inProgress, amount } = this.state;
    return (
      toData &&
      !toError &&
      !amountError &&
      !inProgress &&
      this.parseFloat(amount) > 0
    );
  };
  next = () => {
    // make sure 3 decimals in amount
    const { amount, asset, precision } = this.state;
    const fixedAmount = this.formatNumber(amount, precision);
    this.stateSet({ step: 2, amount: fixedAmount });
  };
  nextPowerDown = () => {
    this.stateSet({
      step: 2,
      amount: "0.000",
      asset: this.state.asset === VESTING_TOKEN ? "POB" : this.state.asset,
    });
  };
  back = () => {
    this.stateSet({ step: 1 });
  };
  confirm = () => {
    this.stateSet({ step: 3 });
  };
  parseFloat = (s: string) => {
    return parseFloat(s.replace(/,/g, ""));
  };
  sign = (key: PrivateKey) => {
    const { activeUser, mode } = this.props;
    const {
      to,
      amount,
      asset,
      memo,
      precision,
      estimatedRequiredHiveCollateral,
    } = this.state;
    const fullAmount = `${amount} ${asset}`;
    console.log({ fullAmount });
    const username = activeUser?.username!;
    const assetUnstakes: UnStake | undefined | null = (() => {
      if (is_FullHiveEngineAccount(activeUser.data)) {
        const { token_unstakes } = activeUser.data as FullHiveEngineAccount;
        return token_unstakes
          ? (token_unstakes as Array<UnStake>).find((x) => x.symbol === asset)
          : null;
      }
      return undefined;
    })();
    let promise: Promise<any>;
    switch (mode) {
      case "transfer": {
        if (asset === "POINT") {
          promise = transferPoint(username, key, to, fullAmount, memo);
        } else if ([DOLLAR_API_NAME, HIVE_API_NAME].includes(asset)) {
          promise = transfer(username, key, to, fullAmount, memo);
        } else {
          promise = transferHiveEngineAsset(
            username,
            key,
            to,
            fullAmount,
            memo
          );
        }
        break;
      }
      case "transfer-saving": {
        promise = transferToSavings(username, key, to, fullAmount, memo);
        break;
      }
      case "borrow": {
        const hiveCollaterialFullAmount =
          this.formatNumber(estimatedRequiredHiveCollateral, 3) +
          ` ${HIVE_API_NAME}`;
        console.log(hiveCollaterialFullAmount);
        promise = collateralizedConvert(
          username,
          key,
          hiveCollaterialFullAmount
        );
        break;
      }
      case "convert": {
        promise = convert(username, key, fullAmount);
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
        // stake_asset must be LIQUID_TOKEN_UPPERCASE, or "VESTS"
        const stake_asset =
          asset === NATIVE_PD_ASSET || asset === "VESTS"
            ? "VESTS"
            : LIQUID_TOKEN_UPPERCASE;
        // vests is a string number formatted for a the HiveEngine or Hive RPC nodes to read like: "1234.567890"
        const vests: string =
          asset === NATIVE_PD_ASSET
            ? this.hpToVests(Number(amount))
            : this.formatNumber(amount, this.getPrecision(stake_asset));
        if (
          stake_asset === LIQUID_TOKEN_UPPERCASE &&
          parseFloat(vests) === 0 &&
          assetUnstakes
        ) {
          promise = cancelWithdrawVesting(username, key, assetUnstakes.txID);
        } else {
          promise = withdrawVesting(username, key, vests, stake_asset);
        }
        break;
      }
      case "delegate": {
        const vests =
          asset === HIVE_API_NAME || asset === NATIVE_PD_ASSET
            ? this.hpToVests(Number(amount))
            : `${amount} ${
                asset === VESTING_TOKEN ? LIQUID_TOKEN_UPPERCASE : asset
              }`;
        promise = delegateVestingShares(username, key, to, vests);
        break;
      }
      default:
        return;
    }
    this.stateSet({ inProgress: true });
    promise
      .then(() => getAccountHEFull(activeUser.username, true))
      .then((a) => {
        const { addAccount, updateActiveUser } = this.props;
        // refresh
        addAccount(a);
        // update active
        updateActiveUser(a);
        this.stateSet({ step: 4, inProgress: false });
      })
      .catch((err) => {
        error(formatError(err));
        console.log(err);
        this.stateSet({ inProgress: false });
      });
  };
  signHs = () => {
    const { activeUser, mode, onHide } = this.props;
    const {
      to,
      amount,
      asset,
      memo,
      precision,
      estimatedRequiredHiveCollateral,
    } = this.state;
    const fullAmount = `${amount} ${asset}`;
    const username = activeUser?.username!;
    const { token_unstakes } = activeUser.data as
      | FullHiveEngineAccount
      | { token_unstakes: undefined };
    const assetUnstakes =
      token_unstakes &&
      token_unstakes.find((x) => x.symbol === LIQUID_TOKEN_UPPERCASE);
    switch (mode) {
      case "transfer": {
        if (asset === "POINT") {
          transferPointHot(username, to, fullAmount, memo);
        } else if ([DOLLAR_API_NAME, HIVE_API_NAME].includes(asset)) {
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
      case "borrow": {
        const hiveCollaterialFullAmount =
          this.formatNumber(estimatedRequiredHiveCollateral, 3) +
          ` ${HIVE_API_NAME}`;
        console.log(hiveCollaterialFullAmount);
        collateralizedConvertHot(username, hiveCollaterialFullAmount);
        break;
      }
      case "convert": {
        convertHot(username, fullAmount);
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
        const stake_asset =
          asset === NATIVE_PD_ASSET || asset === "VESTS"
            ? "VESTS"
            : LIQUID_TOKEN_UPPERCASE;
        const vests: string =
          asset === NATIVE_PD_ASSET
            ? this.hpToVests(Number(amount))
            : this.formatNumber(amount, this.getPrecision(stake_asset));
        if (
          stake_asset === LIQUID_TOKEN_UPPERCASE &&
          parseFloat(vests) === 0 &&
          assetUnstakes
        ) {
          cancelWithdrawVestingHot(username, assetUnstakes.txID);
        } else {
          withdrawVestingHot(username, vests, stake_asset, () => {});
        }
        break;
      }
      case "delegate": {
        const vests =
          asset === HIVE_API_NAME || asset === NATIVE_PD_ASSET
            ? this.hpToVests(Number(amount))
            : `${amount} ${
                asset === VESTING_TOKEN ? LIQUID_TOKEN_UPPERCASE : asset
              }`;
        delegateVestingSharesHot(username, to, vests);
        break;
      }
      default:
        return;
    }
    onHide();
  };
  signKs = () => {
    const { activeUser, mode } = this.props;
    const {
      to,
      amount,
      asset,
      memo,
      precision,
      estimatedRequiredHiveCollateral,
    } = this.state;
    const fullAmount = `${amount} ${
      asset === VESTING_TOKEN ? LIQUID_TOKEN_UPPERCASE : asset
    }`;
    console.log({ fullAmount });
    const username = activeUser?.username!;
    const { token_unstakes } = activeUser.data as FullHiveEngineAccount;
    const assetUnstakes =
      token_unstakes && token_unstakes.find((x) => x.symbol === asset);
    let promise: Promise<any>;
    switch (mode) {
      case "transfer": {
        if (asset === "POINT") {
          promise = transferPointKc(username, to, fullAmount, memo);
        } else if ([DOLLAR_API_NAME, HIVE_API_NAME].includes(asset)) {
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
      case "borrow": {
        const hiveCollaterialFullAmount =
          this.formatNumber(estimatedRequiredHiveCollateral, 3) +
          ` ${HIVE_API_NAME}`;
        console.log(hiveCollaterialFullAmount);
        promise = collateralizedConvertKc(username, hiveCollaterialFullAmount);
        break;
      }
      case "convert": {
        promise = convertKc(username, fullAmount);
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
        const stake_asset =
          asset === NATIVE_PD_ASSET || asset === "VESTS"
            ? "VESTS"
            : LIQUID_TOKEN_UPPERCASE;
        const vests: string =
          asset === NATIVE_PD_ASSET
            ? this.hpToVests(Number(amount))
            : this.formatNumber(amount, this.getPrecision(stake_asset));
        if (
          stake_asset === LIQUID_TOKEN_UPPERCASE &&
          parseFloat(vests) === 0 &&
          assetUnstakes
        ) {
          promise = cancelWithdrawVestingKc(username, assetUnstakes.txID);
        } else {
          promise = withdrawVestingKc(username, vests, stake_asset);
        }
        break;
      }
      case "delegate": {
        const vests =
          asset === HIVE_API_NAME || asset === NATIVE_PD_ASSET
            ? this.hpToVests(Number(amount))
            : `${amount} ${
                asset === VESTING_TOKEN ? LIQUID_TOKEN_UPPERCASE : asset
              }`;
        promise = delegateVestingSharesKc(username, to, vests);
        break;
      }
      default:
        return;
    }
    this.stateSet({ inProgress: true });
    promise
      .then(() => getAccountHEFull(activeUser.username, true))
      .then((a) => {
        const { addAccount, updateActiveUser } = this.props;
        // refresh
        addAccount(a);
        // update active
        updateActiveUser(a);
        this.stateSet({ step: 4, inProgress: false });
      })
      .catch((err) => {
        error(formatError(err));
        console.log(err);
        this.stateSet({ inProgress: false });
      });
  };
  finish = () => {
    const { onHide } = this.props;
    onHide();
  };
  reset = () => {
    this.stateSet(pureState(this.props));
  };
  render() {
    const {
      global,
      mode,
      activeUser,
      transactions,
      dynamicProps,
      hiveEngineTokens,
    } = this.props;
    const {
      step,
      asset,
      to,
      toError,
      toWarning,
      amount,
      amountError,
      memo,
      inProgress,
      precision,
      estimatedRequiredHiveCollateral,
    } = this.state;
    const EnginelessHiveAccount = activeUser.data;
    const recent = [
      ...new Set(
        transactions.list
          .filter(
            (x) => x.type === "transfer" && x.from === activeUser.username
          )
          .map((x) => (x.type === "transfer" ? x.to : ""))
          .filter((x) => {
            if (to.trim() === "") {
              return true;
            }
            return x.indexOf(to) !== -1;
          })
          .reverse()
          .slice(0, 5)
      ),
    ];
    const suggestionProps = {
      header: _t("transfer.recent-transfers"),
      renderer: (i: string) => {
        return (
          <>
            {UserAvatar({ ...this.props, username: i, size: "medium" })}{" "}
            <span style={{ marginLeft: "4px" }}>{i}</span>
          </>
        );
      },
      onSelect: this.toSelected,
    };
    let assets: TransferAsset[] = [];
    switch (mode) {
      case "transfer":
        assets = [
          HIVE_API_NAME,
          DOLLAR_API_NAME,
          ...hiveEngineTokens.map((t) => t.apiName),
        ];
        break;
      case "transfer-saving":
      case "withdraw-saving":
        assets = [HIVE_API_NAME, DOLLAR_API_NAME];
        break;
      case "borrow":
        assets = [HIVE_API_NAME];
        break;
      case "convert":
        assets = [DOLLAR_API_NAME];
        break;
      case "power-up":
        assets = [
          HIVE_API_NAME,
          ...hiveEngineTokens
            .filter((t) => t.stakedHumanName !== "")
            .map((t) => t.apiName),
        ];
        break;
      case "power-down":
      case "delegate":
        assets = [
          "HP",
          ...hiveEngineTokens
            .map((t) => t.stakedHumanName)
            .filter((name) => name !== ""),
        ];
        break;
    }
    const showTo = [
      "transfer",
      "transfer-saving",
      "withdraw-saving",
      "power-up",
      "delegate",
    ].includes(mode);
    const showMemo = [
      "transfer",
      "transfer-saving",
      "withdraw-saving",
    ].includes(mode);
    const balance = this.formatBalance(this.getBalance());
    const titleLngKey =
      mode === "transfer" && asset === "POINT"
        ? _t("transfer-title-point")
        : `${mode}-title`;
    const subTitleLngKey = `${mode}-sub-title`;
    const summaryLngKey = `${mode}-summary`;
    const formHeader1 = (
      <div className="transaction-form-header">
        <div className="step-no">1</div>
        <div className="box-titles">
          <div className="main-title">{_t(`transfer.${titleLngKey}`)}</div>
          <div className="sub-title">{_t(`transfer.${subTitleLngKey}`)}</div>
        </div>
      </div>
    );
    const formHeader2 = (
      <div className="transaction-form-header">
        <div className="step-no">2</div>
        <div className="box-titles">
          <div className="main-title">{_t("transfer.confirm-title")}</div>
          <div className="sub-title">{_t("transfer.confirm-sub-title")}</div>
        </div>
      </div>
    );
    const formHeader3 = (
      <div className="transaction-form-header">
        <div className="step-no">3</div>
        <div className="box-titles">
          <div className="main-title">{_t("trx-common.sign-title")}</div>
          <div className="sub-title">{_t("trx-common.sign-sub-title")}</div>
        </div>
      </div>
    );
    const formHeader4 = (
      <div className="transaction-form-header">
        <div className="step-no">4</div>
        <div className="box-titles">
          <div className="main-title">{_t("trx-common.success-title")}</div>
          <div className="sub-title">{_t("trx-common.success-sub-title")}</div>
        </div>
      </div>
    );
    // Powering down
    if (step === 1 && mode === "power-down") {
      const w = new HiveWallet(activeUser.data, dynamicProps);
      let liquid_asset: string;
      let fhea: FullHiveEngineAccount;
      let unstakes: Array<UnStake>;
      let pob_unstake;
      let nextTransactionTimestamp;
      // @ts-ignore
      if (
        (asset === "HP" &&
          w.isPoweringDown &&
          (liquid_asset = HIVE_API_NAME)) ||
        (VESTING_TOKEN &&
          asset === VESTING_TOKEN &&
          (fhea = activeUser.data as FullHiveEngineAccount) &&
          (unstakes = fhea.token_unstakes) &&
          (pob_unstake = unstakes.find((x) => x.symbol === "POB")) &&
          (liquid_asset = "POB"))
      ) {
        const fractionDigits = this.getPrecision(liquid_asset);
        return (
          <div className="transfer-dialog-content">
            <div className="transaction-form">
              {formHeader1}
              <div className="transaction-form-body powering-down">
                <p>{_t("transfer.powering-down")}</p>
                {asset === "HP" && (
                  <p>
                    {" "}
                    {_t("wallet.next-power-down", {
                      time: moment(w.nextVestingWithdrawalDate).fromNow(),
                      amount: formattedNumber(
                        w.nextVestingSharesWithdrawalHive,
                        { fractionDigits, suffix: HIVE_API_NAME }
                      ),
                    })}
                  </p>
                )}
                {pob_unstake && (
                  <p>
                    {" "}
                    {_t("wallet.next-power-down", {
                      time: moment(
                        pob_unstake.nextTransactionTimestamp
                      ).fromNow(),
                      amount: formattedNumber(
                        (
                          parseFloat(pob_unstake.quantityLeft) /
                          parseFloat(pob_unstake.numberTransactionsLeft)
                        ).toFixed(8),
                        { fractionDigits: 8, suffix: "POB" }
                      ),
                    })}
                  </p>
                )}
                <p>
                  <Button onClick={this.nextPowerDown} variant="danger">
                    {_t("transfer.stop-power-down")}
                  </Button>
                </p>
              </div>
            </div>
          </div>
        );
      }
    }
    return (
      <div className="transfer-dialog-content">
        {step === 1 && (
          <div
            className={`transaction-form ${inProgress ? "in-progress" : ""}`}
          >
            {formHeader1}
            {inProgress && <LinearProgress />}
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
                    <Form.Control value={activeUser.username} readOnly={true} />
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
                            autoFocus={to === ""}
                            placeholder={_t("transfer.to-placeholder")}
                            value={to}
                            onChange={this.toChanged}
                            className={toError ? "is-invalid" : ""}
                          />
                        </InputGroup>
                      </SuggestionList>
                    </Col>
                  </Form.Group>
                  {toWarning && <FormText msg={toWarning} type="danger" />}
                  {toError && <FormText msg={toError} type="danger" />}
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
                      autoFocus={mode !== "transfer"}
                    />
                  </InputGroup>
                  {assets.length > 1 &&
                    (assets.length < 4 && assets.join(".").length < 13 ? (
                      <AssetSwitch
                        options={assets}
                        selected={asset}
                        onChange={this.assetChanged}
                      />
                    ) : (
                      <select
                        onChange={(e) => this.assetChanged(e.target.value)}
                        defaultValue={asset}
                      >
                        {assets.map((this_asset) => (
                          <option key={this_asset} value={this_asset}>
                            {this_asset}
                          </option>
                        ))}
                      </select>
                    ))}
                </Col>
              </Form.Group>
              {amountError && <FormText msg={amountError} type="danger" />}
              <Row>
                <Col lg={{ span: 10, offset: 2 }}>
                  <div className="balance">
                    <span className="balance-label">
                      {_t("transfer.balance")}
                      {": "}
                    </span>
                    <span className="balance-num" onClick={this.copyBalance}>
                      {balance} {asset}
                    </span>
                    {asset === "HP" && (
                      <div className="balance-hp-hint">
                        {_t("transfer.available-hp-hint")}
                      </div>
                    )}
                  </div>
                  {!!estimatedRequiredHiveCollateral && (
                    <div>
                      <Tooltip
                        content={_t("transfer.required-collateral-explanation")}
                      >
                        <div className="balance">
                          <span className="balance-label">
                            {_t("transfer.required-collateral")}
                            {": "}
                          </span>
                          <span className="balance-num">
                            {formattedNumber(estimatedRequiredHiveCollateral, {
                              fractionDigits: 3,
                              suffix: HIVE_API_NAME,
                            })}
                          </span>
                        </div>
                      </Tooltip>
                      <Tooltip
                        content={_t("transfer.collaterial-convert-explanation")}
                      >
                        <div className="balance">
                          <span className="balance-label">
                            {_t("transfer.collateral-convert-exchange-rate")}
                            {": "}
                          </span>
                          <span className="balance-num">
                            {formattedNumber(
                              (HIVE_CONVERSION_COLLATERAL_RATIO *
                                this.parseFloat(amount)) /
                                estimatedRequiredHiveCollateral,
                              {
                                fractionDigits: 3,
                                suffix: `${DOLLAR_API_NAME}/${HIVE_API_NAME}`,
                              }
                            )}
                          </span>
                        </div>
                      </Tooltip>
                    </div>
                  )}
                  {(() => {
                    if (mode === "power-down") {
                      if (
                        asset === LIQUID_TOKEN_UPPERCASE ||
                        asset == VESTING_TOKEN
                      ) {
                        const antiLogPrecision = Math.pow(10, precision || 0);
                        const hiveEngineTokens =
                          Math.round(
                            (this.parseFloat(amount) / 4) * antiLogPrecision
                          ) / antiLogPrecision;
                        // FormattedNumber cannot display numbers that are so small the format() function displays scientific notation.
                        if (
                          !isNaN(hiveEngineTokens) &&
                          hiveEngineTokens >= 1e-6
                        ) {
                          return (
                            <div className="power-down-estimation">
                              {_t("transfer.power-down-estimated", {
                                n: formattedNumber(hiveEngineTokens, {
                                  fractionDigits: precision,
                                  suffix: LIQUID_TOKEN_UPPERCASE,
                                }),
                              })}
                            </div>
                          );
                        }
                      } else {
                        const hive =
                          Math.round((Number(amount) / 13) * 1000) / 1000;
                        if (!isNaN(hive) && hive > 0) {
                          return (
                            <div className="power-down-estimation">
                              {_t("transfer.power-down-estimated", {
                                n: `${this.formatNumber(hive, 3)} HIVE`,
                              })}
                            </div>
                          );
                        }
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
                  <FormText msg={_t("transfer.memo-help")} type="muted" />
                </>
              )}
              <Form.Group as={Row}>
                <Col sm={{ span: 10, offset: 2 }}>
                  <Button onClick={this.next} disabled={!this.canSubmit()}>
                    {_t("g.next")}
                  </Button>
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
                <div className="confirm-title">
                  {_t(`transfer.${titleLngKey}`)}
                </div>
                <div className="users">
                  <div className="from-user">
                    {UserAvatar({
                      ...this.props,
                      username: activeUser.username,
                      size: "medium",
                    })}
                  </div>
                  {showTo && (
                    <>
                      <div className="arrow">{arrowRightSvg}</div>
                      <div className="to-user">
                        {UserAvatar({
                          ...this.props,
                          username: to,
                          size: "medium",
                        })}
                      </div>
                    </>
                  )}
                </div>
                <div className="amount">
                  {(() => {
                    try {
                      const { hiveEngineTokensProperties } = global;
                      const tokenProperties =
                        hiveEngineTokensProperties &&
                        hiveEngineTokensProperties[LIQUID_TOKEN_UPPERCASE];
                      const tokenInfo = tokenProperties && tokenProperties.info;
                      const tokenFractionDigits =
                        tokenInfo && tokenInfo.precision;
                      const fractionDigits =
                        asset === LIQUID_TOKEN_UPPERCASE
                          ? tokenFractionDigits
                          : 3;
                      let o = FormattedNumber(amount, {
                        fractionDigits,
                        suffix: asset,
                      });
                      return o;
                    } catch (e) {
                      return amount.toString() + " " + asset;
                    }
                  })()}
                </div>
                {asset === "HP" && (
                  <div className="amount-vests">
                    {formattedNumber(this.hpToVests(Number(amount)), {
                      fractionDigits: 6,
                      suffix: "VESTS",
                    })}
                  </div>
                )}
                {asset != HIVE_API_NAME &&
                  asset != DOLLAR_API_NAME &&
                  asset != "HP" &&
                  ["power-down", "delegate"].includes(mode) && (
                    <div className="amount-vests">
                      {formattedNumber(amount, {
                        fractionDigits: 6,
                        suffix: asset,
                      })}
                    </div>
                  )}
                {mode === "borrow" && asset === HIVE_API_NAME && (
                  <div>
                    Estimated Hive required ...{" "}
                    {this.state.estimatedRequiredHiveCollateral} {HIVE_API_NAME}
                  </div>
                )}
                {memo && <div className="memo">{memo}</div>}
              </div>
              <div className="d-flex justify-content-center">
                <Button
                  variant="outline-secondary"
                  disabled={inProgress}
                  onClick={this.back}
                >
                  {_t("g.back")}
                </Button>
                <span className="hr-6px-btn-spacer" />
                <Button disabled={inProgress} onClick={this.confirm}>
                  {inProgress && <span>spinner</span>}
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
                onKc: this.signKs,
                // power-ups, maybe power-downs are broken for Hive Siger for HE tokens but delegations and undelegations
                // for HE tokens are just fine..  Quietly hide the Hive Signer option in these circumstances,
                hSBroken: false,
              })}
              <p className="text-center">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    this.stateSet({ step: 2 });
                  }}
                >
                  {_t("g.back")}
                </a>
              </p>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="transaction-form">
            {formHeader4}
            <div className="transaction-form-body">
              <Tsx
                k={`transfer.${summaryLngKey}`}
                args={{
                  amount: `${amount} ${asset}`,
                  from: activeUser.username,
                  to,
                }}
              >
                <div className="success" />
              </Tsx>
              <div className="d-flex justify-content-center">
                <Button variant="outline-secondary" onClick={this.reset}>
                  {_t("transfer.reset")}
                </Button>
                <span className="hr-6px-btn-spacer" />
                <Button onClick={this.finish}>{_t("g.finish")}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default class TransferDialog extends Component<Props> {
  render() {
    const { onHide } = this.props;
    return (
      <Modal
        animation={false}
        show={true}
        centered={true}
        onHide={onHide}
        keyboard={false}
        className="transfer-dialog modal-thin-header"
        size="lg"
      >
        <Modal.Header closeButton={true} />
        <Modal.Body>
          <Transfer {...this.props} />
        </Modal.Body>
      </Modal>
    );
  }
}
