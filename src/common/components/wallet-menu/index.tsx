import React, { Fragment, Component } from "react";

import { Link } from "react-router-dom";

import { Global } from "../../store/global/types";

const logo = require("../../img/logo-small-transparent.png");

import _c from "../../util/fix-class-names";

import { hiveSvg } from "../../img/svg";

interface Props {
  global: Global;
  username: string;
  active: string;
  hiveEngineTokens: Array<{
    apiName: string;
    liquidHumanName: string;
    stakedHumanName: string;
    precision: number;
  }>;
}

export default class WalletMenu extends Component<Props> {
  render() {
    const { global, username, active, hiveEngineTokens } = this.props;

    return (
      <div className="wallet-menu">
        <Fragment>
          {hiveEngineTokens &&
            hiveEngineTokens.map((t) => (
              <Link
                key={t.apiName}
                className={_c(
                  `menu-item hive ${active === "hiveEngine" ? "active" : ""}`
                )}
                to={`/@${username}/wallet?aPICoinName=${t.apiName}&precision=${t.precision}&coinName=${t.liquidHumanName}&stakedCoinName=${t.stakedHumanName}`}
              >
                <span className="title">{t.liquidHumanName}</span>
                <span className="sub-title">Wallet</span>
                <span className="platform-logo">
                  <img alt={t.apiName} src={logo} />
                </span>
              </Link>
            ))}
        </Fragment>
        <Link
          className={_c(`menu-item hive ${active === "hive" ? "active" : ""}`)}
          to={`/@${username}/hive`}
        >
          <span className="title">Hive</span>
          <span className="sub-title">Wallet</span>
          <span className="platform-logo">{hiveSvg}</span>
        </Link>
      </div>
    );
  }
}
