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
    const { currencyRate, currencySymbol, currencyPrecision } = global;

    const valInCurrency = value * currencyRate;

    return (
      <>
        {formattedNumber(valInCurrency, {
          fractionDigits: fixAt ?? currencyPrecision,
          prefix: currencySymbol,
        })}
      </>
    );
  }
}
