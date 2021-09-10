import React, { Component } from "react";

import { Global } from "../../store/global/types";

import formattedNumber from "../../util/formatted-number";

interface Props {
  global: Global;
  value: number;
  fixAt: number;
}

export default class FormattedCurrency extends Component<Props> {
  public static defaultProps: Partial<Props> = {};

  render() {
    const { global, value, fixAt } = this.props;
    const { currencyRate, currencySymbol } = global;

    const valInCurrency = value * currencyRate;

    return (
      <>
        {formattedNumber(valInCurrency, {
          fractionDigits: fixAt ?? currencySymbol === "฿" ? 6 : 2,
          prefix: currencySymbol,
        })}
      </>
    );
  }
}
