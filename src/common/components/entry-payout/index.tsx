import React, { Component, Fragment } from "react";
import moment from "moment";
import { Popover, OverlayTrigger } from "react-bootstrap";
import { Entry } from "../../store/entries/types";
import { Global } from "../../store/global/types";
import { DynamicProps } from "../../store/dynamic-props/types";
import FormattedCurrency from "../formatted-currency/index";
import parseAsset from "../../helper/parse-asset";
import parseDate from "../../helper/parse-date";
import formattedNumber from "../../util/formatted-number";
import { _t } from "../../i18n";
import { TokenInfoConfigPriceTriple } from "../../store/hive-engine-tokens/types";
import _c from "../../util/fix-class-names";
import { HIVE_API_NAME, DOLLAR_API_NAME } from "../../api/hive";
interface Props {
  global: Global;
  dynamicProps: DynamicProps;
  entry: Entry;
}
export class EntryPayoutDetail extends Component<Props> {
  render() {
    const { entry, dynamicProps, global } = this.props;
    const { hiveEngineTokensProperties } = global;
    const { base, quote, hbdPrintRate } = dynamicProps;
    const { he } = this.props.entry;
    const payoutDate = moment(parseDate(entry.payout_at));
    const beneficiary = entry.beneficiaries;
    const pendingHivePayout = parseAsset(entry.pending_payout_value).amount;
    const promotedPayout = parseAsset(entry.promoted).amount;
    const authorPayout = parseAsset(entry.author_payout_value).amount;
    const curatorPayout = parseAsset(entry.curator_payout_value).amount;
    const maxPayout = parseAsset(entry.max_accepted_payout).amount;
    const fullPower = entry.percent_hbd === 0;
    let pendingPayout = pendingHivePayout;
    const tokenAmounts: { [id: string]: number } = {};
    if (he && hiveEngineTokensProperties) {
      for (const token in he) {
        let tokenInfo: TokenInfoConfigPriceTriple;
        if (!(tokenInfo = hiveEngineTokensProperties[token])) continue;
        const postTokenRewardInfo = he[token];
        let hivePrice: number = tokenInfo.hivePrice || 0;
        const complete_payout_value =
          postTokenRewardInfo.pending_token ||
          postTokenRewardInfo.total_payout_value ||
          0;
        if (complete_payout_value > 0) {
          const tokenAmount =
            complete_payout_value *
            Math.pow(10, -postTokenRewardInfo.precision);
          const tokenProps = hiveEngineTokensProperties[token];
          pendingPayout += (tokenAmount * hivePrice * base) / quote;
        }
      } // for
    }
    const totalPayout = pendingPayout + authorPayout + curatorPayout;
    const payoutLimitHit = totalPayout >= maxPayout;
    const HBD_PRINT_RATE_MAX = 10000;
    const percentHiveDollars = entry.percent_hbd / 20000;
    const pendingPayoutHbd = pendingHivePayout * percentHiveDollars;
    const pricePerHive = base / quote;
    const pendingPayoutHp =
      (pendingHivePayout - pendingPayoutHbd) / pricePerHive;
    const pendingPayoutPrintedHbd =
      pendingPayoutHbd * (hbdPrintRate / HBD_PRINT_RATE_MAX);
    const pendingPayoutPrintedHive =
      (pendingPayoutHbd - pendingPayoutPrintedHbd) / pricePerHive;
    let breakdownPayout: string[] = [];
    if (pendingHivePayout > 0) {
      if (pendingPayoutPrintedHbd > 0) {
        breakdownPayout.push(
          formattedNumber(pendingPayoutPrintedHbd, {
            fractionDigits: 3,
            suffix: DOLLAR_API_NAME,
          })
        );
      }
      if (pendingPayoutPrintedHive > 0) {
        breakdownPayout.push(
          formattedNumber(pendingPayoutPrintedHive, {
            fractionDigits: 3,
            suffix: HIVE_API_NAME,
          })
        );
      }
      if (pendingPayoutHp > 0) {
        breakdownPayout.push(
          formattedNumber(pendingPayoutHp, { fractionDigits: 3, suffix: "HP" })
        );
      }
    }
    if (he) {
      try {
        for (const token in this.props.entry.he) {
          const postTokenRewardInfo = this.props.entry.he[token];
          let tokenProperties: TokenInfoConfigPriceTriple;
          let hivePrice: number;
          const complete_payout_value =
            postTokenRewardInfo.pending_token ||
            postTokenRewardInfo.total_payout_value ||
            0;
          if (
            complete_payout_value > 0 &&
            hiveEngineTokensProperties &&
            (tokenProperties = hiveEngineTokensProperties[token]) &&
            tokenProperties.hivePrice &&
            tokenProperties.info &&
            postTokenRewardInfo
          ) {
            if (tokenProperties.info.precision !== undefined) {
              const tokenAmount: number =
                complete_payout_value *
                Math.pow(10, -postTokenRewardInfo.precision || 0);
              breakdownPayout.push(
                formattedNumber(tokenAmount, {
                  maximumFractionDigits: postTokenRewardInfo.precision,
                  suffix: token,
                })
              );
            }
          }
        }
      } catch (e) {
        console.log("HE Stuff threw an exception: entry-payout/index");
      }
    }
    return (
      <div className="payout-popover-content">
        {fullPower && (
          <p>
            <span className="label">{_t("entry-payout.reward")}</span>
            <span className="value">{_t("entry-payout.full-power")}</span>
          </p>
        )}
        {pendingPayout > 0 && (
          <p>
            <span className="label">{_t("entry-payout.pending-payout")}</span>
            <span className="value">
              <FormattedCurrency
                {...this.props}
                value={pendingPayout}
                fixAt={3}
              />
            </span>
          </p>
        )}
        {promotedPayout > 0 && (
          <p>
            <span className="label">{_t("entry-payout.promoted")}</span>
            <span className="value">
              <FormattedCurrency
                {...this.props}
                value={promotedPayout}
                fixAt={3}
              />
            </span>
          </p>
        )}
        {authorPayout > 0 && (
          <p>
            <span className="label">{_t("entry-payout.author-payout")}</span>
            <span className="value">
              <FormattedCurrency
                {...this.props}
                value={authorPayout}
                fixAt={3}
              />
            </span>
          </p>
        )}
        {curatorPayout > 0 && (
          <p>
            <span className="label">{_t("entry-payout.curators-payout")}</span>
            <span className="value">
              <FormattedCurrency
                {...this.props}
                value={curatorPayout}
                fixAt={3}
              />
            </span>
          </p>
        )}
        {beneficiary.length > 0 && (
          <p>
            <span className="label">{_t("entry-payout.beneficiary")}</span>
            <span className="value">
              {beneficiary.map((x, i) => (
                <Fragment key={i}>
                  {x.account}: {(x.weight / 100).toFixed(0)}% <br />
                </Fragment>
              ))}
            </span>
          </p>
        )}
        {breakdownPayout.length > 0 && (
          <p>
            <span className="label">{_t("entry-payout.breakdown")}</span>
            <span className="value">
              {breakdownPayout.map((x, i) => (
                <Fragment key={i}>
                  {x} <br />
                </Fragment>
              ))}
            </span>
          </p>
        )}
        <p>
          <span className="label">{_t("entry-payout.payout-date")}</span>
          <span className="value">{payoutDate.fromNow()}</span>
        </p>
        {payoutLimitHit && (
          <p>
            <span className="label">{_t("entry-payout.max-accepted")}</span>
            <span className="value">
              <FormattedCurrency {...this.props} value={maxPayout} fixAt={3} />
            </span>
          </p>
        )}
      </div>
    );
  }
}
export class EntryPayout extends Component<Props> {
  render() {
    const { entry, global, dynamicProps } = this.props;
    const { hiveEngineTokensProperties } = global;
    const { he } = entry;
    const { base, quote } = dynamicProps;
    const isPayoutDeclined = parseAsset(entry.max_accepted_payout).amount === 0;
    const pendingPayout = parseAsset(entry.pending_payout_value).amount;
    const authorPayout = parseAsset(entry.author_payout_value).amount;
    const curatorPayout = parseAsset(entry.curator_payout_value).amount;
    const maxPayout = parseAsset(entry.max_accepted_payout).amount;
    let totalPayout = pendingPayout + authorPayout + curatorPayout;
    try {
      if (he && hiveEngineTokensProperties) {
        for (const token in he)
          if (hiveEngineTokensProperties[token] && he[token]) {
            //console.log({token});
            const tokenProperties: TokenInfoConfigPriceTriple =
              hiveEngineTokensProperties[token];
            const postTokenRewardInfo = he[token];
            const tokenInfo = tokenProperties.info;
            const tokenConfig = tokenProperties.config;
            let hivePrice: number = tokenProperties.hivePrice || 0;
            if (token === "POB") {
              //console.log({tokenInfo, tokenConfig, postTokenRewardInfo});
            }
            let complete_payout_value: number =
              (postTokenRewardInfo &&
                (postTokenRewardInfo.pending_token ||
                  postTokenRewardInfo.total_payout_value)) ||
              0;
            if (complete_payout_value > 0 && hivePrice) {
              const tokenAmount =
                complete_payout_value *
                Math.pow(10, -postTokenRewardInfo.precision);
              if (tokenAmount && hivePrice && base && quote)
                totalPayout += (tokenAmount * hivePrice * base) / quote;
              else
                console.log(
                  "skipping adding because one of these values is falsy:",
                  { tokenAmount, hivePrice, base, quote }
                );
            }
          }
      }
    } catch (e) {
      console.log("Error handling HE data");
    }
    const payoutLimitHit = totalPayout >= maxPayout;
    const shownPayout =
      payoutLimitHit && maxPayout > 0 ? maxPayout : totalPayout;
    const popover = (
      <Popover id={`payout-popover`} className="payout-popover">
        <Popover.Content>
          <EntryPayoutDetail {...this.props} />
        </Popover.Content>
      </Popover>
    );
    return (
      <OverlayTrigger
        trigger={["hover", "focus"]}
        overlay={popover}
        delay={1000}
      >
        <div
          className={_c(
            `entry-payout ${isPayoutDeclined ? "payout-declined" : ""} ${
              payoutLimitHit ? "payout-limit-hit" : ""
            } notranslate`
          )}
        >
          <FormattedCurrency {...this.props} value={shownPayout} />
        </div>
      </OverlayTrigger>
    );
  }
}
export default (p: Props) => {
  const props = {
    global: p.global,
    dynamicProps: p.dynamicProps,
    entry: p.entry,
  };
  return <EntryPayout {...props} />;
};
