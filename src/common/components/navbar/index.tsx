import React, { Component } from "react";

import { History, Location } from "history";

import { Button } from "react-bootstrap";

import { Link } from "react-router-dom";

import isEqual from "react-fast-compare";

import queryString from "query-string";

import { Global, Theme } from "../../store/global/types";
import { TrendingTags } from "../../store/trending-tags/types";
import { Account } from "../../store/accounts/types";
import { User } from "../../store/users/types";
import { ActiveUser } from "../../store/active-user/types";
import { UI, ToggleType } from "../../store/ui/types";
import {
  NotificationFilter,
  Notifications,
} from "../../store/notifications/types";
import { DynamicProps } from "../../store/dynamic-props/types";
import NotificationHandler from "../notification-handler";
import SwitchLang from "../switch-lang";

import ToolTip from "../tooltip";
import Search from "../search";
import Login from "../login";
import UserNav from "../user-nav";
import { _t } from "../../i18n";

import _c from "../../util/fix-class-names";

import {
  brightnessSvg,
  pencilOutlineSvg,
  menuSvg,
  closeSvg,
} from "../../img/svg";

const logo = require("../../img/bluebrain-logo-circle.webp");
const hiveLogo = require("../../img/hiveLogo.png");
const discordLogo = require("../../img/discord-logo-transparent-better.png");

import { hiveSvg } from "../../img/svg";
import site from "../../constants/site.json";
interface Props {
  history: History;
  location: Location;
  global: Global;
  dynamicProps: DynamicProps;
  trendingTags: TrendingTags;
  users: User[];
  activeUser: ActiveUser | null;
  ui: UI;
  notifications: Notifications;
  step?: number;
  fetchTrendingTags: () => void;
  toggleTheme: () => void;
  addUser: (user: User) => void;
  setActiveUser: (username: string | null) => void;
  updateActiveUser: (data?: Account) => void;
  addAccount: (data: Account) => void;
  deleteUser: (username: string) => void;
  fetchNotifications: (since: string | null) => void;
  fetchUnreadNotificationCount: () => void;
  setNotificationsFilter: (filter: NotificationFilter | null) => void;
  markNotifications: (id: string | null) => void;
  toggleUIProp: (what: ToggleType) => void;
  muteNotifications: () => void;
  unMuteNotifications: () => void;
  setLang: (lang: string) => void;
  setStepOne?: () => void;
}

interface State {
  smVisible: boolean;
  floating: boolean;
}

export class NavBar extends Component<Props, State> {
  state: State = {
    smVisible: false,
    floating: false,
  };

  timer: any = null;
  nav = React.createRef<HTMLDivElement>();

  componentDidMount() {
    this.detect();
    window.addEventListener("scroll", this.scrollChanged);
    window.addEventListener("resize", this.scrollChanged);

    // referral check / redirect
    const { location, history } = this.props;
    const qs = queryString.parse(location.search);
    if (!location.pathname.startsWith("/signup") && qs.referral) {
      history.push(`/signup?referral=${qs.referral}`);
    }
  }

  componentWillUnmount() {
    window.removeEventListener("scroll", this.scrollChanged);
    window.removeEventListener("resize", this.scrollChanged);
  }

  shouldComponentUpdate(
    nextProps: Readonly<Props>,
    nextState: Readonly<State>
  ): boolean {
    return (
      !isEqual(this.props.global, nextProps.global) ||
      !isEqual(this.props.trendingTags, nextProps.trendingTags) ||
      !isEqual(this.props.users, nextProps.users) ||
      !isEqual(this.props.activeUser, nextProps.activeUser) ||
      !isEqual(this.props.ui, nextProps.ui) ||
      !isEqual(this.props.notifications, nextProps.notifications) ||
      !isEqual(this.props.location, nextProps.location) ||
      !isEqual(this.props.step, nextProps.step) ||
      !isEqual(this.state, nextState)
    );
  }

  scrollChanged = () => {
    clearTimeout(this.timer);
    this.timer = setTimeout(this.detect, 100);
  };

  detect = () => {
    const nav = this.nav.current;
    if (!nav) return;

    const limit = nav.clientHeight * 2;
    const floating = window.scrollY >= limit;

    if (floating) {
      nav.classList.add("can-float");
    } else {
      nav.classList.remove("can-float");
    }

    this.setState({ floating });
  };

  changeTheme = () => {
    this.props.toggleTheme();
  };

  toggleSmVisible = () => {
    const { smVisible } = this.state;
    this.setState({ smVisible: !smVisible });
  };

  handleIconClick = () => {
    if (
      "/" !== this.props?.location?.pathname ||
      this.props?.location?.pathname?.startsWith("/hot") ||
      this.props?.location?.pathname?.startsWith("/created") ||
      this.props?.location?.pathname?.startsWith("/trending")
    ) {
      this.props.history.push("/");
    }
    if (this.props.setStepOne) {
      return this.props.setStepOne();
    }
  };

  render() {
    const { global, activeUser, ui, step, setStepOne } = this.props;
    const themeText =
      global.theme == Theme.day
        ? _t("navbar.night-theme")
        : _t("navbar.day-theme");
    const logoHref = activeUser ? `/@${activeUser.username}/feed` : "/";

    const { smVisible, floating } = this.state;

    const transparentVerify =
      this.props?.location?.pathname?.startsWith("/hot") ||
      this.props?.location?.pathname?.startsWith("/created") ||
      this.props?.location?.pathname?.startsWith("/trending");

    return (
      <>
        {floating && <div className="nav-bar-rep" />}
        <div className="nav-bar-toggle" onClick={this.toggleSmVisible}>
          {smVisible ? closeSvg : menuSvg}
        </div>
        {!smVisible && (
          <div className="nav-bar-sm">
            <div
              style={{ display: "flex", flexDirection: "row" }}
              className="brand"
            >
              <Link to={"/created/" + site.communityUsername}>
                <img src={logo} className="logo" alt="Logo" />
              </Link>
              {activeUser !== null ? (
                <Link to={logoHref} className="logo">
                  <img src={hiveLogo} className="logo" width="5%" alt="Logo" />
                </Link>
              ) : (
                <div onClick={this.handleIconClick}>
                  <img src={hiveLogo} className="logo" width="5%" alt="Logo" />
                </div>
              )}
            </div>
          </div>
        )}
        <div
          ref={this.nav}
          className={_c(
            `nav-bar ${smVisible ? "visible-sm" : ""} ${
              !transparentVerify && step === 1 ? "transparent" : ""
            }`
          )}
        >
          <div className="nav-bar-inner">
            <div
              style={{ display: "flex", flexDirection: "row" }}
              className="brand"
            >
              <Link to={"/created/" + site.communityUsername}>
                <img src={logo} className="logo" alt="Logo" />
              </Link>
              {activeUser !== null ? (
                <Link to={logoHref}>
                  {" "}
                  <img src={hiveLogo} className="logo" width="5%" alt="Logo" />
                </Link>
              ) : (
                <div onClick={this.handleIconClick} className="brand">
                  <img
                    src={hiveLogo}
                    className="logo"
                    width="100%"
                    alt="Logo"
                  />
                </div>
              )}
              <a href="https://discord.gg/8vBmmtS9ZU" target="discord">
                <img src={discordLogo} className="logo" alt="discord" />
              </a>
            </div>
            <div className="flex-spacer" />
            {(step !== 1 || transparentVerify) && (
              <div className="search-bar">{Search({ ...this.props })}</div>
            )}
            <div className="switch-menu">
              {SwitchLang({ ...this.props })}
              {(step !== 1 || transparentVerify) && (
                <ToolTip content={themeText}>
                  <div className="switch-theme" onClick={this.changeTheme}>
                    {brightnessSvg}
                  </div>
                </ToolTip>
              )}
              {(step !== 1 || transparentVerify) && (
                <ToolTip content={_t("navbar.post")}>
                  <Link className="switch-theme pencil" to="/submit">
                    {pencilOutlineSvg}
                  </Link>
                </ToolTip>
              )}
            </div>
            <div className="btn-menu">
              {!activeUser && (
                <div>
                  <div className="login-required">
                    <Button
                      className="btn-login btn-primary"
                      onClick={() => {
                        const { toggleUIProp } = this.props;
                        toggleUIProp("login");
                      }}
                    >
                      {_t("g.login")}
                    </Button>

                    <a
                      className="btn btn-primary"
                      href="https://signup.hive.io/"
                      target="signup"
                    >
                      {_t("g.signup")}
                    </a>
                  </div>
                  <div className="submit-post">
                    <ToolTip content={_t("navbar.post")}>
                      <Link className="btn btn-outline-primary" to="/submit">
                        {pencilOutlineSvg}
                      </Link>
                    </ToolTip>
                  </div>
                </div>
              )}
            </div>
            {activeUser && (
              <div>
                <UserNav {...this.props} activeUser={activeUser} />
                <div className="submit-post">
                  <ToolTip content={_t("navbar.post")}>
                    <Link className="btn btn-outline-primary" to="/submit">
                      {pencilOutlineSvg}
                    </Link>
                  </ToolTip>
                </div>
              </div>
            )}
          </div>
          {ui.login && <Login {...this.props} />}
          <NotificationHandler {...this.props} />
        </div>
      </>
    );
  }
}

export default (p: Props) => {
  const props: Props = {
    history: p.history,
    location: p.location,
    global: p.global,
    dynamicProps: p.dynamicProps,
    trendingTags: p.trendingTags,
    users: p.users,
    activeUser: p.activeUser,
    ui: p.ui,
    notifications: p.notifications,
    step: p.step,
    fetchTrendingTags: p.fetchTrendingTags,
    toggleTheme: p.toggleTheme,
    addUser: p.addUser,
    setActiveUser: p.setActiveUser,
    updateActiveUser: p.updateActiveUser,
    addAccount: p.addAccount,
    deleteUser: p.deleteUser,
    fetchNotifications: p.fetchNotifications,
    fetchUnreadNotificationCount: p.fetchUnreadNotificationCount,
    setNotificationsFilter: p.setNotificationsFilter,
    markNotifications: p.markNotifications,
    toggleUIProp: p.toggleUIProp,
    muteNotifications: p.muteNotifications,
    unMuteNotifications: p.unMuteNotifications,
    setLang: p.setLang,
    setStepOne: p.setStepOne,
  };

  return <NavBar {...props} />;
};
