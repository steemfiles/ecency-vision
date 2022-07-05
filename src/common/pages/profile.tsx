import React from "react";
import { connect } from "react-redux";
import { match } from "react-router";
import { ListStyle } from "../store/global/types";
import { makeGroupKey } from "../store/entries";
import { ProfileFilter } from "../store/global/types";
import BaseComponent from "../components/base";
import Meta from "../components/meta";
import Theme from "../components/theme";
import Feedback from "../components/feedback";
import NavBar from "../components/navbar";
import NavBarElectron from "../../desktop/app/components/navbar";
import NotFound from "../components/404";
import LinearProgress from "../components/linear-progress/index";
import EntryListLoadingItem from "../components/entry-list-loading-item";
import DetectBottom from "../components/detect-bottom";
import EntryListContent from "../components/entry-list";
import ProfileCard from "../components/profile-card";
import ProfileMenu from "../components/profile-menu";
import ProfileCover from "../components/profile-cover";
import ProfileCommunities from "../components/profile-communities";
import ProfileSettings from "../components/profile-settings";
import WalletHive from "../components/wallet-hive";
import WalletEcency from "../components/wallet-ecency";
import WalletHiveEngine from "../components/wallet-hive-engine";
import ScrollToTop from "../components/scroll-to-top";
import { getAccountHEFull, tokenAliases } from "../api/hive-engine";
import {
  HIVE_ENGINE_TOKENS,
  LIQUID_TOKEN_UPPERCASE,
} from "../../client_config";
import defaults from "../constants/site.json";
import _c from "../util/fix-class-names";
import {
  PageProps,
  pageMapDispatchToProps,
  pageMapStateToProps,
} from "./common";
import { History } from "history";
import * as ls from "../util/local-storage";

interface MatchParams {
  username: string;
  section?: string;
}
interface Props extends PageProps {
  match: match<MatchParams>;
  history: History;
}
interface State {
  loading: boolean;
  isDefaultPost: boolean;
}
class ProfilePage extends BaseComponent<Props, State> {
  state: State = {
    loading: false,
    isDefaultPost: false,
  };
  async componentDidMount() {
    await this.ensureAccount();
    const props = this.props;
    const {
      match,
      global,
      fetchEntries,
      fetchTransactions,
      fetchPoints,
      transactions,
      activeUser,
      history,
    } = props;
    const { username } = match.params;
    console.log(match.params.section, ls.get("profile-section"));
    const section = match.params.section || ls.get("profile-section");
    const { list } = transactions;
    if (match.params.section != ls.get("profile-section")) {
      ls.set("profile-section", section);
    }
    if (
      section === "settings" &&
      username &&
      (!activeUser ||
        !activeUser.data ||
        activeUser.data.name !== username.replace("@", ""))
    ) {
      console.log([activeUser && activeUser.data, username]);
      ls.set("profile-section", "blog");
      history.push(`/${username}/blog`);
    }
    const most_recent_transaction_num = list.length ? list[0].num : 0;

    if (!section || (section && Object.keys(ProfileFilter).includes(section))) {
      // fetch posts
      fetchEntries(global.filter, global.tag, false);
    }
  }
  componentDidUpdate(prevProps: Readonly<Props>): void {
    const {
      match,
      global,
      fetchEntries,
      fetchTransactions,
      resetTransactions,
      fetchPoints,
      resetPoints,
      history,
    } = this.props;
    const { match: prevMatch, entries } = prevProps;

    const { username } = match.params;
    const { isDefaultPost } = this.state;
    const section = match.params.section || ls.get("profile-section");

    // username changed. re-fetch wallet transactions and points
    if (username !== prevMatch.params.username) {
      this.ensureAccount().then(() => {
        resetTransactions();
        fetchTransactions(username);
        resetPoints();
        fetchPoints(username);
      });
    }
    // Wallet and points are not a correct filter to fetch posts
    if (section === "hive") {
      history.push(`/${username}/wallet?token=hive`);
    }
    if (section && !Object.keys(ProfileFilter).includes(section)) {
      return;
    }
    // filter or username changed. fetch posts.
    if (
      section !== prevMatch.params.section ||
      username !== prevMatch.params.username
    ) {
      fetchEntries(global.filter, global.tag, false);
    }

    if (entries) {
      const { filter, tag } = global;
      const groupKey = makeGroupKey(filter, tag);
      const prevData = entries[groupKey];
      if (prevData) {
        const data = this.props.entries[groupKey];
        const { loading } = data;
        const { loading: prevLoading } = prevData;
        if (
          loading !== prevLoading &&
          !loading &&
          data.entries.length === 0 &&
          groupKey === `blog-${username}` &&
          !isDefaultPost
        ) {
          this.setState({ isDefaultPost: true });
          history.push(`/${username}/posts`);
        }
      }
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    const { resetTransactions, resetPoints } = this.props;
    // reset transactions and points on unload
    resetTransactions();
    resetPoints();
  }
  ensureAccount = () => {
    const { match, accounts, addAccount } = this.props;
    const username = match.params.username.replace("@", "");
    const account = accounts.find((x) => x.name === username);
    if (!account) {
      // The account isn't in reducer. Fetch it and add to reducer.
      this.stateSet({ loading: true });
      return getAccountHEFull(username, true)
        .then((data) => {
          if (data.name === username) {
            addAccount(data);
          }
        })
        .finally(() => {
          this.stateSet({ loading: false });
        });
    } else {
      // The account is in reducer. Update it.
      return getAccountHEFull(username, true).then((data) => {
        if (data.name === username) {
          addAccount(data);
        }
      });
    }
  };
  bottomReached = () => {
    const { global, entries, fetchEntries } = this.props;
    const { filter, tag } = global;
    const groupKey = makeGroupKey(filter, tag);
    const data = entries[groupKey];
    const { loading, hasMore } = data;
    if (!loading && hasMore) {
      fetchEntries(filter, tag, true);
    }
  };
  reload = () => {
    const {
      match,
      global,
      invalidateEntries,
      fetchEntries,
      resetTransactions,
      fetchTransactions,
      resetPoints,
      fetchPoints,
    } = this.props;
    const { username } = match.params;
    const section = match.params.section || ls.get("profile-section");

    this.stateSet({ loading: true });
    this.ensureAccount()
      .then(() => {
        // reload transactions
        resetTransactions();
        fetchTransactions(username);
        // reload points
        resetPoints();
        fetchPoints(username);
        if (
          !section ||
          (section && Object.keys(ProfileFilter).includes(section))
        ) {
          // reload posts
          invalidateEntries(makeGroupKey(global.filter, global.tag));
          fetchEntries(global.filter, global.tag, false);
        }
      })
      .finally(() => {
        this.stateSet({ loading: false });
      });
  };
  render() {
    const { global, entries, accounts, match } = this.props;
    const { loading } = this.state;
    const navBar = global.isElectron
      ? NavBarElectron({
          ...this.props,
          reloadFn: this.reload,
          reloading: loading,
        })
      : NavBar({ ...this.props });
    if (loading) {
      return (
        <>
          {navBar}
          <LinearProgress />
        </>
      );
    }
    const username = match.params.username.replace("@", "");
    const section =
      match.params.section || ls.get("profile-section") || ProfileFilter.blog;
    const account = accounts.find((x) => x.name === username);
    if (!account) {
      return NotFound({ ...this.props });
    }
    //  Meta config
    const url = `${defaults.base}/@${username}${section ? `/${section}` : ""}`;
    const metaProps = account.__loaded
      ? {
          title: `${account.profile?.name || account.name}'s ${
            section ? `${section}` : ""
          } on decentralized web`,
          description:
            `${
              account.profile?.about
                ? `${account.profile?.about} ${section ? `${section}` : ""}`
                : `${account.profile?.name || account.name} ${
                    section ? `${section}` : ""
                  }`
            }` || "",
          url: `/@${username}${section ? `/${section}` : ""}`,
          canonical: url,
          image: `${defaults.imageServer}/u/${username}/avatar/medium`,
          rss: `${defaults.base}/@${username}/rss`,
          keywords: `${username}, ${username}'s blog`,
        }
      : {};

    const { filter, tag } = global;
    const groupKey = makeGroupKey(filter, tag);
    const data = entries[groupKey];

    const coinInfo = (() => {
      const defaultRet = HIVE_ENGINE_TOKENS[0];
      try {
        const params_string = window.location.search.slice(1);
        const params_list = params_string.split("&");
        const settings = params_list.map((x) => x.split("="));
        let aPICoinName: string =
          ls.get("profile-wallet-token") ?? LIQUID_TOKEN_UPPERCASE;
        const oldAPICoinName = aPICoinName;
        for (const setting of settings) {
          if (setting[0] === "aPICoinName" || setting[0] === "token") {
            aPICoinName = setting[1].toUpperCase();
          }
        }
        if (section === "wallet" && aPICoinName !== oldAPICoinName) {
          ls.set("profile-wallet-token", aPICoinName);
        }

        if (aPICoinName === "HIVE") {
          return {
            apiName: "HIVE",
            liquidHumanName: "Hive",
            stakedShort: "HP",
          };
        }
        const coinInfo =
          HIVE_ENGINE_TOKENS.find((ki) => ki.apiName == aPICoinName) ??
          HIVE_ENGINE_TOKENS[0];
        return coinInfo;
      } catch (e) {}
      return defaultRet;
    })();
    const coinAPIName = coinInfo.apiName;
    const coinName = coinInfo.liquidHumanName;
    const stakedCoinName = tokenAliases[coinAPIName].stakedShort;
    const aPICoinName = coinAPIName;

    return (
      <>
        <Meta {...metaProps} />
        <ScrollToTop />
        <Theme global={this.props.global} />
        <Feedback />
        {navBar}
        <div className="app-content profile-page">
          <div className="profile-side">
            {ProfileCard({
              ...this.props,
              account,
              section,
            })}
          </div>
          <span itemScope={true} itemType="http://schema.org/Person">
            {account.__loaded && (
              <meta
                itemProp="name"
                content={account.profile?.name || account.name}
              />
            )}
          </span>
          <div className="content-side">
            {ProfileMenu({
              ...this.props,
              username,
              section,
            })}
            {[...Object.keys(ProfileFilter), "communities"].includes(section) &&
              ProfileCover({
                ...this.props,
                account,
              })}
            {(() => {
              if (!coinInfo) {
                return null;
              }

              if (section === "wallet" && coinAPIName != "HIVE") {
                return (
                  <div key={coinAPIName}>
                    {WalletHiveEngine({
                      ...this.props,
                      coinName,
                      aPICoinName: coinAPIName,
                      stakedCoinName,
                      hiveEngineTokens: HIVE_ENGINE_TOKENS,
                      account,
                    })}
                  </div>
                );
              }
              if (
                section === "hive" ||
                (section === "wallet" && coinAPIName == "HIVE")
              ) {
                return WalletHive({
                  ...this.props,
                  hiveEngineTokens: HIVE_ENGINE_TOKENS,
                  account,
                });
              }
              if (section === "points") {
                return WalletEcency({
                  ...this.props,
                  hiveEngineTokens: HIVE_ENGINE_TOKENS,
                  account,
                });
              }
              if (section === "communities") {
                return ProfileCommunities({
                  ...this.props,
                  account,
                });
              }
              if (section === "settings") {
                return ProfileSettings({
                  ...this.props,
                  account,
                });
              }

              const { filter, tag } = global;
              const groupKey = makeGroupKey(filter, tag);
              const data = entries[groupKey];

              if (data !== undefined) {
                const entryList = data?.entries;
                const loading = data?.loading;
                return (
                  <>
                    <div
                      className={_c(`entry-list ${loading ? "loading" : ""}`)}
                    >
                      <div
                        className={_c(
                          `entry-list-body ${
                            global.listStyle === ListStyle.grid
                              ? "grid-view"
                              : ""
                          }`
                        )}
                      >
                        {loading && entryList.length === 0 && (
                          <EntryListLoadingItem />
                        )}
                        {EntryListContent({
                          ...this.props,
                          entries: entryList,
                          promotedEntries: [],
                          loading,
                        })}
                      </div>
                    </div>
                    {loading && entryList.length > 0 ? <LinearProgress /> : ""}
                    <DetectBottom onBottom={this.bottomReached} />
                  </>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </>
    );
  }
}
export default connect(
  pageMapStateToProps,
  pageMapDispatchToProps
)(ProfilePage);
