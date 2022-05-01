import React, { Fragment, Component } from "react";

import { Link } from "react-router-dom";

import { Global } from "../../store/global/types";

import { HiveEngineStaticInfo } from "../../store/hive-engine-tokens/types";

import _c from "../../util/fix-class-names";

import { hiveSvg } from "../../img/svg";
import { HIVE_HUMAN_NAME } from "../../api/hive";
interface Props {
  global: Global;
  username: string;
  active: string;
  hiveEngineTokens: Array<HiveEngineStaticInfo>;
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
              return (
                <Link
                  key={t.apiName}
                  className={_c(
                    `menu-item hive ${t.apiName === active ? "active" : ""}`
                  )}
                  to={`/@${username}/wallet?token=${t.apiName.toLowerCase()}`}
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
          to={`/@${username}/wallet?token=hive`}
        >
          <span className="title">{HIVE_HUMAN_NAME}</span>
          <span className="sub-title">Wallet</span>
          <span className="platform-logo">{hiveSvg}</span>
        </Link>
      </div>
    );
  }
}
