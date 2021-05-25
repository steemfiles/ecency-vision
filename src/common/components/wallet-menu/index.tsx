import React, {Component} from "react";

import {Link} from "react-router-dom";

import {Global} from "../../store/global/types";

const logo = require('../../img/logo-small-transparent.png');

import _c from "../../util/fix-class-names";

import {hiveSvg} from "../../img/svg";
import {LIQUID_TOKEN, LIQUID_TOKEN_UPPERCASE} from "../../../client_config";

interface Props {
    global: Global;
    username: string;
    active: string;
}

export default class WalletMenu extends Component<Props> {
    render() {
        const {global, username, active} = this.props;

        return (
            <div className="wallet-menu">
                <Link className={_c(`menu-item hive ${active === "hiveEngine" ? "active" : ""}`)} to={`/@${username}/wallet`}>
                    <span className="title">{LIQUID_TOKEN}</span>
                    <span className="sub-title">Wallet</span>
                    <span className="platform-logo"><img alt={LIQUID_TOKEN_UPPERCASE} src={logo} /></span>
                </Link>
                <Link className={_c(`menu-item hive ${active === "hive" ? "active" : ""}`)} to={`/@${username}/hive`}>
                    <span className="title">Hive</span>
                    <span className="sub-title">Wallet</span>
                    <span className="platform-logo">{hiveSvg}</span>
                </Link>
                {global.usePrivate && (
                    <Link className={_c(`menu-item ecency ${active === "ecency" ? "active" : ""}`)} to={`/@${username}/points`}>
                        <span className="title">Ecency</span>
                        <span className="sub-title">Points</span>
                        <span className="platform-logo"><img alt="ecency" src={logo}/></span>
                    </Link>
                )}
            </div>
        );
    }
}

