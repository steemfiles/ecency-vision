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
import { hiveClient } from "../api/hive";
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
  updating: boolean;
  loading: boolean;
  isDefaultPost: boolean;
  most_recent_transaction_num: number;
  updateTransactionsIntervalIdentifier: any;
}
class ProfilePage extends BaseComponent<Props, State> {
  state: State = {
    loading: false,
    updating: false,
    isDefaultPost: false,
    updateTransactionsIntervalIdentifier: 0,
    most_recent_transaction_num: 0,
  };

  updateTransactionsPingHandler = () => {
    // It would be nice to have an event for when new transactions relevant come to the blockchain
    // Perhaps something integrated into the Javascript event system.
    const { list, group, oldest } = this.props.transactions;
    const {
      match,
      updateTransactions,
      fetchTransactions,
      getMoreTransactions,
    } = this.props;
    let { username } = match.params;
    const { updating } = this.state;

    const user = username.replace("@", "");

    if (list.length > 0) {
      const most_recent_transaction_num =
        this.state.most_recent_transaction_num || list[0].num;
      const oldest_transaction_num = list[list.length - 1].num;
      if (!updating) {
        this.setState({ updating: true });
        // checking for new transactions.
        hiveClient
          .call("condenser_api", "get_account_history", [user, -1, 1])
          .then((r: any) => {
            if (r === null) return;
            if (r.length === 0) return;
            const x = r[0];
            if (x[0] === most_recent_transaction_num) {
              // no changes
              //console.log(`The most recent transaction number is still ${most_recent_transaction_num}`);
              this.setState({ updating: false });
              //getMoreTransactions(username, group, Math.min(oldest, oldest_transaction_num));
            } else {
              // there are new transfers to add to the list.
              console.log(
                `Updating txs for after ${most_recent_transaction_num}...`,
                { x }
              );
              this.setState({
                most_recent_transaction_num: x[0],
                updating: false,
              });
              updateTransactions(username, group, most_recent_transaction_num);
              this.ensureAccount();
            }
          })
          .finally(() => {
            this.setState({ updating: false });
          });
      } else {
        console.log("Update triggered but updating flag is set");
      }
    }
  };

  getTokenFromURL(): string | null {
    const { match } = this.props;
    const { section } = match.params;
    if (section === "hive") {
      return "HIVE";
    }
    if (section !== "wallet") {
      return null;
    }
    try {
      const params_string = window.location.search.slice(1);
      const params_list = params_string.split("&");
      const settings = params_list.map((x) => x.split("="));
      for (const setting of settings) {
        if (setting[0] === "aPICoinName" || setting[0] === "token") {
          return setting[1].toUpperCase();
        }
      }
      return null;
    } catch (e) {}
    return null;
  }

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
    } = props;
    const { username } = match.params;
    console.log(match.params.section, ls.get("profile-section"));
    const section = match.params.section || ls.get("profile-section");
    const { list } = transactions;
    if (match.params.section != ls.get("profile-section")) {
      ls.set("profile-section", section);
    }
    const most_recent_transaction_num = list.length ? list[0].num : 0;

    if (!section || (section && Object.keys(ProfileFilter).includes(section))) {
      // fetch posts
      fetchEntries(global.filter, global.tag, false);
    }
    // fetch wallet transactions
    fetchTransactions(username);
    // fetch points
    fetchPoints(username);

    const updateTransactionsIntervalIdentifier = setInterval(
      this.updateTransactionsPingHandler.bind(this),
      15000
    );

    // Using a stream of blocks uses more bandwidth than polling history / 15s.
    this.setState({
      updateTransactionsIntervalIdentifier,
      most_recent_transaction_num,
    });
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
        this.setState({ most_recent_transaction_num: 0 });
        resetTransactions();
        fetchTransactions(username);
        resetPoints();
        fetchPoints(username);
      });
    }
    // Wallet and points are not a correct filter to fetch posts
    if (
      section === "hive" ||
      (section === "wallet" && this.getTokenFromURL() === null)
    ) {
      const token =
        section === "hive"
          ? "hive"
          : ls.get("profile-wallet-token") ?? LIQUID_TOKEN_UPPERCASE;
      ls.set("profile-wallet-token", token.toUpperCase());
      history.push(`/${username}/wallet?token=${token.toLowerCase()}`);
    }

    {
      const prevTransactions = prevProps.transactions;
      const { transactions } = this.props;
      if (
        prevTransactions.list.length === 0 ||
        (transactions.list.length !== 0 &&
          prevTransactions.list[0].num != transactions.list[0].num)
      ) {
        // do nothing
      }
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
    const { updateTransactionsIntervalIdentifier } = this.state;
    // reset transactions and points on unload
    resetTransactions();
    resetPoints();
    if (updateTransactionsIntervalIdentifier != 0) {
      clearInterval(updateTransactionsIntervalIdentifier);
    }
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
    console.log("bottom reached!");
    const {
      global,
      entries,
      fetchEntries,
      fetchTransactions,
      getMoreTransactions,
      transactions,
      match,
    } = this.props;
    const { filter, tag } = global;
    const { list, oldest, group } = transactions;
    const section =
      match.params.section || ls.get("profile-section") || ProfileFilter.blog;

    const { loading, updating } = this.state;
    if (
      section == "hive" ||
      (section === "wallet" && this.getTokenFromURL() === "HIVE")
    ) {
      const username = match.params.username.replace("@", "");
      if (!loading && !updating && username && list.length) {
        this.setState({ updating: true });
        const oldest_transaction_num = list[list.length - 1].num;
        console.log("getting more from", {
          group,
          oldest,
          oldest_transaction_num,
        });
        getMoreTransactions(
          username,
          group,
          Math.min(oldest, oldest_transaction_num)
        );
        setTimeout(() => {
          this.setState({ updating: false });
        }, 500);
      }
    } else {
      const groupKey = makeGroupKey(filter, tag);
      const data = entries[groupKey];
      const { loading, hasMore } = data;
      if (!loading && hasMore) {
        fetchEntries(filter, tag, true);
      }
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
        this.setState({ most_recent_transaction_num: 0 });
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
    const { global, entries, accounts, match, transactions } = this.props;
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
                return (
                  <>
                    {WalletHive({
                      ...this.props,
                      hiveEngineTokens: HIVE_ENGINE_TOKENS,
                      account,
                    })}
                    <DetectBottom onBottom={this.bottomReached} />
                  </>
                );
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
