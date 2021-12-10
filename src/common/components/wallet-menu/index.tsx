import React, { Fragment, Component } from "react";

import { Link } from "react-router-dom";

import { Global } from "../../store/global/types";

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
            hiveEngineTokens.map((t) => {
              const logo = require("../../img/coins/" + t.apiName + ".png");
              console.log([t.apiName, active]);
              return (
                <Link
                  key={t.apiName}
                  className={_c(
                    `menu-item hive ${t.apiName === active ? "active" : ""}`
                  )}
                  to={`/@${username}/wallet?token=${t.apiName}`}
                >
                  <span className="title">{t.liquidHumanName}</span>
                  <span className="sub-title">Wallet</span>
                  <span className="platform-logo">
                    <img alt={t.apiName} src={logo} />
                  </span>
                </Link>
              );
            })}
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
