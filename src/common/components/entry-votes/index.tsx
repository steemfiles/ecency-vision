import React, {Component} from "react";
import {Form, FormControl} from "react-bootstrap";
import {History} from "history";
import moment from "moment";
import {Modal, Spinner} from "react-bootstrap";
import {Global} from "../../store/global/types";
import {Entry} from "../../store/entries/types";
import {Account} from "../../store/accounts/types";
import BaseComponent from "../base";
import UserAvatar from "../user-avatar/index";
import FormattedCurrency from "../formatted-currency";
import ProfileLink from "../profile-link/index";
import Tooltip from "../tooltip";
import Pagination from "../pagination";
import {Vote, getActiveVotes} from "../../api/hive";
import {PriceHash} from "../../store/prices/types";
import parseAsset from "../../helper/parse-asset";
import parseDate from "../../helper/parse-date";
import accountReputation from "../../helper/account-reputation";
import formattedNumber from "../../util/formatted-number";
import {_t} from "../../i18n";
import {peopleSvg} from "../../img/svg";
import {TokenPropertiesMap, TokenInfoConfigPair} from "../../store/hive-engine-tokens/types";
export const prepareVotes = (entry: Entry, votes: Vote[], hiveEngineTokensProperties: TokenPropertiesMap|undefined): Vote[] => {
    let totalHivePayout =
    parseAsset(entry.pending_payout_value).amount +
    parseAsset(entry.author_payout_value).amount +
    parseAsset(entry.curator_payout_value).amount;
    let totalPayout = totalHivePayout;
    const {he} = entry;
    if (he && hiveEngineTokensProperties) {
        for (const token in he) {
            let tokenInfo: TokenInfoConfigPair;
            if (!(tokenInfo=hiveEngineTokensProperties[token]))
                continue;
            const postTokenRewardInfo = he[token];
            let hivePrice:number = tokenInfo.hivePrice || 0;
            const complete_payout_value = postTokenRewardInfo.pending_token || postTokenRewardInfo.total_payout_value || 0;
            if (complete_payout_value > 0) {
                const tokenAmount = complete_payout_value * Math.pow(10,- postTokenRewardInfo.precision);
                const tokenProps = hiveEngineTokensProperties[token];
                totalPayout += tokenAmount * hivePrice;
            } // if
        } // for
    } // if
    const voteHiveRshares = votes.reduce((a, b) => a + parseFloat(b.rshares), 0);
    const ratio = totalPayout / voteHiveRshares;
    return votes.map((a) => {
        const rew = parseFloat(a.rshares) * ratio;
        return Object.assign({}, a, {
            reward: rew,
            timestamp: parseDate(a.time).getTime(),
            percent: a.percent / 100,
        });
    })
};
type SortOption = "reward" | "timestamp" | "voter" | "percent";
interface DetailProps {
    history: History;
    global: Global;
    entry: Entry;
    addAccount: (data: Account) => void;
}
interface DetailState {
    loading: boolean;
    votes: Vote[];
    page: number;
    sort: SortOption
}
export class EntryVotesDetail extends BaseComponent<DetailProps, DetailState> {
    state: DetailState = {
        loading: false,
        votes: [],
        page: 1,
        sort: "reward"
    };
    componentDidMount() {
        const {entry} = this.props;
        this.stateSet({loading: true});
        getActiveVotes(entry.author, entry.permlink)
            .then((r) => {
                this.setVotes(r);
            })
            .finally(() => {
                this.stateSet({loading: false});
            });
    }
    setVotes = (data: Vote[]) => {
        const {entry} = this.props;
        this.stateSet({votes: prepareVotes(entry, data, this.props.global.hiveEngineTokensProperties), loading: false});
    };
    sortChanged = (e: React.ChangeEvent<FormControl & HTMLInputElement>) => {
        this.stateSet({sort: e.target.value as SortOption});
    };
    render() {
        const {loading, votes, page, sort} = this.state;
        if (loading) {
            return (
                <div className="dialog-loading">
                    <Spinner animation="grow" variant="primary"/>
                </div>
            );
        }
        const pageSize = 12;
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const sliced = votes.sort((a, b) => {
            const keyA = a[sort]!;
            const keyB = b[sort]!;
            if (keyA > keyB) return -1;
            if (keyA < keyB) return 1;
            return 0;
        }).slice(start, end);
        return (
            <>
                <div className="voters-list">
                    <div className="list-body">
                        {sliced.map(x => {
                            return <div className="list-item" key={x.voter}>
                                <div className="item-main">
                                    {ProfileLink({
                                        ...this.props,
                                        username: x.voter,
                                        children: <>{UserAvatar({...this.props, username: x.voter, size: "small"})}</>
                                    })}
                                    <div className="item-info">
                                        {ProfileLink({
                                            ...this.props,
                                            username: x.voter,
                                            children: <a className="item-name notransalte">{x.voter}</a>
                                        })}
                                        <span className="item-reputation">{accountReputation(x.reputation)}</span>
                                    </div>
                                </div>
                                <div className="item-extra">
                                    <FormattedCurrency {...this.props} value={x.reward} fixAt={3}/>
                                    <span className="separator"/>
                                    {formattedNumber(x.percent, {fractionDigits: 1, suffix: "%"})}
                                    <span className="separator"/>
                                    <Tooltip content={moment(x.timestamp).format("LLLL")}>
                                        <span>{moment(x.timestamp).fromNow()}</span>
                                    </Tooltip>
                                </div>
                            </div>;
                        })}
                    </div>
                </div>
                <div className="list-tools">
                    <div className="pages">
                        {votes.length > pageSize && <Pagination dataLength={votes.length} pageSize={pageSize} maxItems={4} onPageChange={(page) => {
                            this.stateSet({page});
                        }}/>}
                    </div>
                    <div className="sorter">
                        <span className="label">{_t("entry-votes.sort")}</span>
                        <Form.Control as="select" onChange={this.sortChanged} value={sort}>
                            <option value="reward">{_t("entry-votes.sort-reward")}</option>
                            <option value="timestamp">{_t("entry-votes.sort-timestamp")}</option>
                            <option value="reputation">{_t("entry-votes.sort-reputation")}</option>
                            <option value="percent">{_t("entry-votes.sort-percent")}</option>
                        </Form.Control>
                    </div>
                </div>
            </>
        );
    }
}
interface Props {
    history: History;
    global: Global;
    entry: Entry;
    addAccount: (data: Account) => void;
}
interface State {
    visible: boolean;
}
export class EntryVotes extends Component<Props, State> {
    state: State = {
        visible: false,
    };
    toggle = () => {
        const {visible} = this.state;
        this.setState({visible: !visible});
    };
    render() {
        const {entry} = this.props;
        const {visible} = this.state;
        const totalVotes = entry.active_votes.length;
        const title =
            totalVotes === 0
                ? _t("entry-votes.title-empty")
                : totalVotes === 1
                ? _t("entry-votes.title")
                : _t("entry-votes.title-n", {n: totalVotes});
        const child = (
            <>
                {peopleSvg} {totalVotes}
            </>
        );
        if (totalVotes === 0) {
            return (
                <div className="entry-votes notranslate">
                    <Tooltip content={title}>
                        <span className="inner-btn no-data">{child}</span>
                    </Tooltip>
                </div>
            );
        }
        return (
            <>
                <div className="entry-votes notranslate">
                    <Tooltip content={title}><span className="inner-btn" onClick={this.toggle}>{child}</span></Tooltip>
                </div>
                {visible && (
                    <Modal onHide={this.toggle} show={true} centered={true} size="lg" animation={false} className="entry-votes-modal">
                        <Modal.Header closeButton={true}>
                            <Modal.Title>{title}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <EntryVotesDetail {...this.props} entry={entry}/>
                        </Modal.Body>
                    </Modal>
                )}
            </>
        );
    }
}
export default (p: Props) => {
    const props = {
        history: p.history,
        global: p.global,
        entry: p.entry,
        addAccount: p.addAccount
    }
    return <EntryVotes {...props} />;
}
