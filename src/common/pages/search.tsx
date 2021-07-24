import React, { Component } from "react";

import { connect } from "react-redux";

import queryString from "query-string";

import Meta from "../components/meta";
import Theme from "../components/theme/index";
import NavBar from "../components/navbar/index";
import NavBarElectron from "../../desktop/app/components/navbar";
import SearchComment from "../components/search-comment";
import SearchPeople from "../components/search-people";
import SearchTopics from "../components/search-topics";
import SearchCommunities from "../components/search-communities";

import { _t } from "../i18n";

import {
  PageProps,
  pageMapDispatchToProps,
  pageMapStateToProps,
} from "./common";

interface State {
  q: string;
}

export default class SearchBase extends Component<PageProps, State> {
  state: State = {
    q: "",
  };

  componentDidMount() {
    const { location, history } = this.props;
    const qs = queryString.parse(location.search);

    if (!qs.q) {
      history.push("/");
      return;
    }

    this.setState({ q: qs.q as string });
  }
}

class SearchPage extends SearchBase {
  render() {
    const { q } = this.state;
    if (!q) {
      return null;
    }

    //  Meta config
    const metaProps = {
      title: _t("search-page.title"),
      description: _t("search-page.description"),
    };

    const { global } = this.props;

    return (
      <>
        <Meta {...metaProps} />
        <Theme global={this.props.global} />
        {global.isElectron
          ? NavBarElectron({
              ...this.props,
            })
          : NavBar({ ...this.props })}
        <div className="app-content search-page">
          <div className="search-main">
            <SearchComment {...this.props} limit={8} />
          </div>
          <div className="search-side">
            <SearchPeople {...this.props} />
            <SearchCommunities {...this.props} />
            <SearchTopics {...this.props} />
          </div>
        </div>
      </>
    );
  }
}

const SearchPageContainer = connect(
  pageMapStateToProps,
  pageMapDispatchToProps
)(SearchPage);
export { SearchPageContainer };

class SearchMorePage extends SearchBase {
  render() {
    const { q } = this.state;
    if (!q) {
      return null;
    }

    //  Meta config
    const metaProps = {
      title: _t("search-page.title"),
      description: _t("search-page.description"),
    };

    const { global } = this.props;

    return (
      <>
        <Meta {...metaProps} />
        <Theme global={this.props.global} />
        {global.isElectron
          ? NavBarElectron({
              ...this.props,
            })
          : NavBar({ ...this.props })}
        <div className="app-content search-more-page">
          <SearchComment {...this.props} />
        </div>
      </>
    );
  }
}

const SearchMorePageContainer = connect(
  pageMapStateToProps,
  pageMapDispatchToProps
)(SearchMorePage);
export { SearchMorePageContainer };
