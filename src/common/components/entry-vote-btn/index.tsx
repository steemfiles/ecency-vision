import React, {Component} from "react";

import {Form, FormControl, Modal} from "react-bootstrap";

import {Global} from "../../store/global/types";
import {Account} from "../../store/accounts/types";
import {Entry, EntryVote} from "../../store/entries/types";
import {User} from "../../store/users/types";
import {ActiveUser} from "../../store/active-user/types";
import {DynamicProps} from "../../store/dynamic-props/types";
import {ToggleType, UI} from "../../store/ui/types";
import {PriceHash} from "../../store/prices/types";
import BaseComponent from "../base";
import FormattedCurrency from "../formatted-currency";
import LoginRequired from "../login-required";
import {error} from "../feedback";

import {votingPower} from "../../api/hive";
import {formatError, vote} from "../../api/operations";

import parseAsset from "../../helper/parse-asset";

import * as ls from "../../util/local-storage";

import _c from "../../util/fix-class-names";

import {chevronUpSvg} from "../../img/svg";
import {
    FullHiveEngineAccount,
    getAccountHEFull,
    getScotDataAsync,
    HiveEngineTokenConfig,
    HiveEngineTokenInfo,
    ScotPost,
    ScotVoteShare
} from "../../api/hive-engine";


import {LIQUID_TOKEN_UPPERCASE} from "../../../client_config";


const setVoteValue = (type: "up" | "down", username: string, value: number) => {
    ls.set(`vote-value-${type}-${username}`, value);
};

const getVoteValue = (type: "up" | "down", username: string, def: number): number => {
    return ls.get(`vote-value-${type}-${username}`, def);
};

type Mode = "up" | "down";

interface VoteInfo {
    downvote_weight_multiplier: number;
    downvoting_power: number;
    vote_weight_multiplier: number;
    voting_power: number
}

interface VoteDialogProps {
    global: Global;
    activeUser: ActiveUser;
    dynamicProps: DynamicProps;
    prices: PriceHash;
    //tokenConfig: HiveEngineTokenConfig;
    //tokenInfo: HiveEngineTokenInfo;
    entry: Entry;
    onClick: (percent: number, estimated: number) => void;
}

interface VoteDialogState {
    tokenVotingPower: number;
    upSliderVal: number;
    downSliderVal: number;
    // The maximum dollar amount the user may vote
    totalVotingPower: number;
    estimated: number;
    mode: Mode;
    tokenStake: number;
    tokenInfo: HiveEngineTokenInfo;
    tokenConfig: HiveEngineTokenConfig;
    account: null | FullHiveEngineAccount;
    tokenPost: { [id: string]: ScotPost };
    voteInfo: VoteInfo;
    scotDenom: number;
}


export class VoteDialog extends Component<VoteDialogProps, VoteDialogState> {
    state: VoteDialogState = {
        upSliderVal: getVoteValue("up", this.props.activeUser?.username!, 100),
        downSliderVal: getVoteValue("down", this.props.activeUser?.username!, -100),
        totalVotingPower: 0,
        estimated: 0,
        mode: "up",

        // added for POB
        tokenVotingPower: 0,
        tokenStake: 0,
        scotDenom: 100000000,
        account: null,
        tokenInfo: {
            "claimed_token": 64042553905395,
            "comment_pending_rshares": 99907754724,
            "comment_reward_pool": 0,
            "enable_automatic_account_claim": false,
            "enable_comment_reward_pool": false,
            "enabled": true,
            "enabled_services": null,
            "hive": false,
            "inflation_tools": 1,
            "issued_token": null,
            "issuer": "proofofbrainio",
            "last_compute_post_reward_block_num": 54430269,
            "last_mining_claim_block_num": null,
            "last_mining_claim_trx": null,
            "last_other_accounts_transfer_block_num": 0,
            "last_processed_mining_claim_block_num": 0,
            "last_processed_staking_claim_block_num": 0,
            "last_reduction_block_num": 51653521,
            "last_reward_block_num": 54430269,
            "last_rshares2_decay_time": "Wed, 02 Jun 2021 13:48:06 GMT",
            "last_staking_claim_block_num": null,
            "last_staking_claim_trx": null,
            "last_staking_mining_update_block_num": null,
            "mining_enabled": false,
            "mining_reward_pool": 0,
            "next_mining_claim_number": 0,
            "next_staking_claim_number": 0,
            "other_reward_pool": 0,
            "pending_rshares": 5256419647314555,
            "pending_token": -16200976428176,
            "precision": 8,
            "reward_pool": 8433913238842,
            "rewards_token": 1000000000,
            "setup_complete": 2,
            "staked_mining_power": 0,
            "staked_token": 56045508242256,
            "staking_enabled": false,
            "staking_reward_pool": 0,
            "start_block_num": 51653521,
            "start_date": "Sun, 28 Feb 2021 00:11:39 GMT",
            "symbol": "POB",
            "total_generated_token": 64084700000000,
            "voting_enabled": true
        },
        tokenConfig: {
            "allowlist_account": null,
            "author_curve_exponent": 1.0,
            "author_reward_percentage": 50.0,
            "badge_fee": -1.0,
            "beneficiaries_account": "h@pob-fund",
            "beneficiaries_reward_percentage": 10.0,
            "cashout_window_days": 7.0,
            "curation_curve_exponent": 1.0,
            "disable_downvoting": false,
            "downvote_power_consumption": 2000,
            "downvote_regeneration_seconds": 432000,
            "downvote_window_days": -1,
            "enable_account_allowlist": null,
            "enable_account_muting": true,
            "enable_comment_beneficiaries": true,
            "exclude_apps": null,
            "exclude_apps_from_token_beneficiary": "",
            "exclude_beneficiaries_accounts": "likwid,finex,sct.krwp,h@likwid,h@finex,h@sct.krwp,rewarding.app,h@rewarding.app",
            "exclude_tags": "actifit,steemhunt,appics,dlike,share2steem",
            "fee_post_account": null,
            "fee_post_amount": 0,
            "fee_post_exempt_beneficiary_account": null,
            "fee_post_exempt_beneficiary_weight": 0,
            "hive_community": "hive-150329",
            "hive_enabled": true,
            "hive_engine_enabled": true,
            "issue_token": true,
            "json_metadata_app_value": null,
            "json_metadata_key": "tags",
            "json_metadata_value": "proofofbrain,pob",
            "max_auto_claim_amount": -1.0,
            "miner_tokens": "{}",
            "mining_pool_claim_number": 0,
            "mining_pool_claims_per_year": 0,
            "muting_account": "proofofbrainio",
            "n_daily_posts_muted_accounts": 0,
            "other_pool_accounts": "{}",
            "other_pool_percentage": 0.0,
            "other_pool_send_token_per_year": 0,
            "pob_comment_pool_percentage": 0.0,
            "pob_pool_percentage": 100.0,
            "posm_pool_percentage": 0.0,
            "post_reward_curve": "default",
            "post_reward_curve_parameter": null,
            "promoted_post_account": "null",
            "reduction_every_n_block": 42000000,
            "reduction_percentage": 50.0,
            "rewards_token": 10.0,
            "rewards_token_every_n_block": 40,
            "staked_reward_percentage": 0.0,
            "staking_pool_claim_number": 0,
            "staking_pool_claims_per_year": 0,
            "staking_pool_percentage": 0.0,
            "steem_enabled": false,
            "steem_engine_enabled": false,
            "tag_adding_window_hours": 1.0,
            "token": "POB",
            "token_account": "proofofbrainio",
            "use_staking_circulating_quotent": false,
            "vote_power_consumption": 200,
            "vote_regeneration_seconds": 432000,
            "vote_window_days": 7
        },
        tokenPost: {
            "POB": {
                "active_votes": [],
                "app": "unknown",
                "author": this.props.entry.author,
                "author_curve_exponent": 1,
                "author_payout_beneficiaries": "{}",
                "authorperm": "unknown",
                "beneficiaries_payout_value": 0,
                "block": 54429410,
                "cashout_time": "2021-06-09T13:05:09",
                "children": 1,
                "created": "2021-06-02T13:05:09",
                "curator_payout_value": 0,
                "decline_payout": false,
                "desc": "",
                "hive": true,
                "json_metadata": "{}",
                "last_payout": "1970-01-01T00:00:00",
                "last_update": "1970-01-01T00:00:00",
                "main_post": true,
                "muted": false,
                "parent_author": "",
                "parent_permlink": this.props.entry.parent_permlink || "",
                "pending_token": 0,
                "precision": 8,
                "promoted": 0,
                "score_hot": 0,
                "score_promoted": 0,
                "score_trend": 0,
                "tags": "hive-150329,blog,blogger,motivation,palnet,neoxian,ash,ccc,proofofbrain",
                "title": "Optimism || The single source of truth to a successful life",
                "token": "POB",
                "total_payout_value": 0,
                "total_vote_weight": 0,
                "vote_rshares": 0
            }

        },
        voteInfo: {
            downvote_weight_multiplier: 1,
            vote_weight_multiplier: 1,
            voting_power: 0,
            downvoting_power: 0,
        }
    };


    applyRewardsCurve(r: number) {
        if (!this.state.tokenInfo.pending_rshares)
            return 0;
        return Math.pow(Math.max(0, r), this.state.tokenConfig.author_curve_exponent) *
            (this.state.tokenInfo.reward_pool as number) /
            (this.state.tokenInfo.pending_rshares as number) / this.state.scotDenom;
    }


    estimate = (percent: number): number => {
        const {entry, activeUser, dynamicProps, prices} = this.props;
        if (!activeUser) {
            return 0;
        }
        const {data} = activeUser; // Account
        const account = data;
        if (!account.__loaded) {
            return 0;
        }

        const {base, quote} = dynamicProps;

        const userVotingPower = votingPower(account) * Math.abs(percent);
        let dollarValueFromHive;
        {
            const {fundRecentClaims, fundRewardBalance} = dynamicProps;

            const sign = percent < 0 ? -1 : 1;
            const postRshares = entry.net_rshares;

            const totalVests =
                (parseAsset(account.vesting_shares).amount +
                    parseAsset(account.received_vesting_shares).amount -
                    parseAsset(account.delegated_vesting_shares).amount);

            const userVestingShares = totalVests * 1e6;

            const voteEffectiveShares = userVestingShares * (userVotingPower / 10000) * 0.02;

            // reward curve algorithm (no idea whats going on here)
            const CURVE_CONSTANT = 2000000000000;
            const CURVE_CONSTANT_X4 = 4 * CURVE_CONSTANT;
            const SQUARED_CURVE_CONSTANT = CURVE_CONSTANT * CURVE_CONSTANT;

            const postRsharesNormalized = postRshares + CURVE_CONSTANT;
            const postRsharesAfterVoteNormalized = postRshares + voteEffectiveShares + CURVE_CONSTANT;
            const postRsharesCurve = (postRsharesNormalized * postRsharesNormalized - SQUARED_CURVE_CONSTANT) / (postRshares + CURVE_CONSTANT_X4);
            const postRsharesCurveAfterVote = (postRsharesAfterVoteNormalized * postRsharesAfterVoteNormalized - SQUARED_CURVE_CONSTANT) /
                (postRshares + voteEffectiveShares + CURVE_CONSTANT_X4);

            const voteClaim = postRsharesCurveAfterVote - postRsharesCurve;

            const proportion = voteClaim / fundRecentClaims;
            const fullVote = proportion * fundRewardBalance;

            const voteValue = fullVote * (base / quote);

            if (sign > 0) {
                dollarValueFromHive = Math.max(voteValue * sign, 0);
            } else {
                dollarValueFromHive = voteValue * sign;
            }
        }


        let dollarValueFromPOB = 0;
        // Dollar from POB
        {
            const currentVp = this.state.voteInfo.voting_power / 100;
            console.log({userVotingPower, currentVp, "voteInfo.voting_power": this.state.voteInfo.voting_power});
            let pendingTokenPayoutBeforeVote = 0;
            let scot_total_author_payout = 0;
            let scot_total_curator_payout = 0;
            let scot_token_bene_payout = 0;
            let payout = 0;
            //let promoted = 0;
            //t decline_payout = parseFloat(entry.max_accepted_payout.split(' ')[0]) === 0.0;
            //console.log(this.state.tokenPost);
            const up = this.state.mode === 'up';
            const scotData = this.state.tokenPost[LIQUID_TOKEN_UPPERCASE];
            const {tokenInfo, tokenConfig} = this.state;
            if (!tokenConfig || !tokenInfo) {
                console.log("bailing early because of " + ((!tokenConfig && "no tokenConfig. ") || "") +
                    ((!tokenInfo && "no tokenInfo. ") || ""));
                return dollarValueFromHive;
            }

            //console.log("post entry:", entry);
            const cashout_time = Date.parse(entry.created) + tokenConfig.cashout_window_days * 24 * 3600 * 1000;
            const cashout_active: boolean = cashout_time > (new Date()).getTime();
            //console.log("token Info:", this.state.tokenInfo);
            if (prices) console.log("Prices loaded:", Object.keys(prices).length);
            let token_balances: Array<any> = [];
            if (account["token_balances"]) {
                if (account["token_balances"].length)
                    token_balances = account["token_balances"];
                console.log("token balances 1:", account["token_balances"]);
            }
            if (activeUser) {
                if (activeUser.hiveEngineBalances.length)
                    token_balances = activeUser.hiveEngineBalances;
                console.log("token balances 2:", activeUser.hiveEngineBalances);
            }
            const liquid_balance = token_balances.find(tB => tB.symbol === LIQUID_TOKEN_UPPERCASE);
            //console.log(this.state.account);
            console.log(scotData, cashout_time, cashout_active);

            if (!cashout_active)
                return dollarValueFromHive;

            const SA = token_balances.map(tb => ({symbol: tb.symbol, stake: tb.stake + tb.delegationsIn}));
            let SH = {};
            for (const s of SA) {
                SH[s.symbol] = s.stake;
            }
            console.log(this.state.tokenPost);

            if (!(this.state.tokenInfo.reward_pool && this.state.tokenInfo.pending_rshares && this.state.tokenInfo.precision && this.state.tokenInfo.pending_token)) {
                console.log("Returning early",
                    "reward_pool:", !!this.state.tokenInfo.reward_pool,
                    "pending_rshares:", !!this.state.tokenInfo.pending_rshares,
                    "precision:", !!this.state.tokenInfo.precision,
                    "pending_token:", !!this.state.tokenInfo.pending_token,
                    "currentVP:", currentVp
                );
                if (!this.state.tokenPost) {
                    console.log("tokenPost:", false);
                } else {
                    console.log("tokenPost.POB", this.state.tokenPost[LIQUID_TOKEN_UPPERCASE]);
                }
                return dollarValueFromHive;
            }

            console.log("account Info:", this.state.account);
            console.log("token Info:", this.state.tokenInfo);
            const usersFullUpVoteRShares = this.state.tokenInfo.pending_rshares / this.state.tokenInfo.staked_token
                * (liquid_balance.stake + liquid_balance.delegationsIn - liquid_balance.delegationsOut);// .staked_tokens;
            console.log(usersFullUpVoteRShares);


            const applyRewardsCurve = this.applyRewardsCurve.bind(this);
            const active_votes: Array<ScotVoteShare> = this.state.tokenPost[LIQUID_TOKEN_UPPERCASE] ?
                    this.state.tokenPost[LIQUID_TOKEN_UPPERCASE].active_votes
                    : [];
            console.log({active_votes});
            const rsharesTotal = active_votes
                .map(x => x.rshares)
                .reduce((x, y) => x + y, 0);
            console.log("rshares total ", rsharesTotal);


            const scotDenom = this.state.scotDenom;
            pendingTokenPayoutBeforeVote = applyRewardsCurve(rsharesTotal);

            if (scotDenom === 0) {
                // should never happen unless there are bugs outside.
                console.log("scotDenom set wrong");
                return dollarValueFromHive;
            }
            console.log(scotData);
            console.log({pendingTokenPayoutBeforeVote});
            if (scotData) {
                // This data is available only when a post has been voted on by someone staking the
                // Hive token.
                scot_total_curator_payout = (scotData['curator_payout_value'] || 0) / scotDenom;
                scot_total_author_payout = (scotData['total_payout_value'] || 0) / scotDenom;
                scot_token_bene_payout = (scotData['beneficiaries_payout_value'] || 0) / scotDenom;

                console.log({scot_total_curator_payout, scot_total_author_payout, scot_token_bene_payout})
                //omoted = scotData['promoted'] || 0;
                //cline_payout = !!scotData['decline_payout'];
                scot_total_author_payout -= scot_total_curator_payout;
                scot_total_author_payout -= scot_token_bene_payout;
                payout = cashout_active
                    ? pendingTokenPayoutBeforeVote
                    : scot_total_author_payout + scot_total_curator_payout;
            }
            console.log("pending token to post:", {payout, pendingTokenPayoutBeforeVote, scot_total_author_payout});
            console.log(this.state.tokenInfo);
            const vote_weight_multiplier = this.state.voteInfo.vote_weight_multiplier;
            const down_vote_weight_multiplier = this.state.voteInfo.downvote_weight_multiplier;
            const multiplier = up ? vote_weight_multiplier
                : down_vote_weight_multiplier;
            // need computation for VP. Start with rough estimate.
            console.log({percent, multiplier});
            const rshares = usersFullUpVoteRShares *
                Math.min(multiplier * percent, 10000) *
                currentVp * 100;


            console.log({rshares: rshares, rsharesTotal});

            // Token values
            const newValue = applyRewardsCurve(rsharesTotal + rshares);
            console.log("new POB rewards:", pendingTokenPayoutBeforeVote, newValue);
            const valueEst = newValue - pendingTokenPayoutBeforeVote;
            console.log(prices[LIQUID_TOKEN_UPPERCASE], "HIVE/POB", base / quote, "$/HIVE")
            dollarValueFromPOB = valueEst * prices[LIQUID_TOKEN_UPPERCASE] * base / quote;
        }

        return dollarValueFromHive + dollarValueFromPOB;
    };

    componentDidMount() {
        const {entry, activeUser} = this.props;
        const setState = this.setState.bind(this);
        //console.log("hiveEngineTokensProperties: ", this.props.hiveEngineTokensProperties);

        Promise.all([
            getAccountHEFull(activeUser.username, true),
            getScotDataAsync<HiveEngineTokenInfo>('info', {token: LIQUID_TOKEN_UPPERCASE,}),
            getScotDataAsync<HiveEngineTokenConfig>('config', {token: LIQUID_TOKEN_UPPERCASE,}),
            getScotDataAsync<ScotPost>(`@${entry.author}/${entry.permlink}?hive=1`, {}),
            getScotDataAsync<{ [id: string]: VoteInfo }>(`@${activeUser.username}`, {
                token: LIQUID_TOKEN_UPPERCASE,
                hive: 1
            })
        ]).then(function (value1: [FullHiveEngineAccount, HiveEngineTokenInfo, HiveEngineTokenConfig, { [id: string]: ScotPost }, { [id: string]: VoteInfo }
        ]) {
            const account = value1[0];
            const info = value1[1];
            const config = value1[2];
            const post = value1[3];
            const voteInfoHash = value1[4];
            let voteInfo: VoteInfo;
            if (!voteInfoHash || !(voteInfo = voteInfoHash[LIQUID_TOKEN_UPPERCASE])) {
                console.log("Not setting Hive Engine parameters:", {voteInfoHash, account, info, config, post});
                return;
            }
            const scotDenom = Math.pow(10, info.precision);
            console.log("AccountInfo:", account, "TokenInfo:", info, "config:", config, 'post:', post, {voteInfo});

            if (!account || !info || !config || !post) {
                console.log("Not setting Hive Engine parameters:")
                return;
            }
            setState({tokenInfo: info, tokenConfig: config, account, tokenPost: post, voteInfo, scotDenom});
        });


    }


    upSliderChanged = (e: React.ChangeEvent<FormControl & HTMLInputElement>) => {
        const upSliderVal = Number(e.target.value);
        this.setState({upSliderVal});

        const {activeUser} = this.props;
        setVoteValue("up", activeUser?.username!, upSliderVal);
    };

    downSliderChanged = (e: React.ChangeEvent<FormControl & HTMLInputElement>) => {
        const downSliderVal = Number(e.target.value);
        this.setState({downSliderVal});

        const {activeUser} = this.props;
        setVoteValue("down", activeUser?.username!, downSliderVal);
    };

    changeMode = (m: Mode) => {
        this.setState({mode: m});
    };

    upVoteClicked = () => {
        const {onClick} = this.props;
        const {upSliderVal} = this.state;
        const estimated = Number(this.estimate(upSliderVal).toFixed(3));
        onClick(upSliderVal, estimated);
    };

    downVoteClicked = () => {
        const {onClick} = this.props;
        const {downSliderVal} = this.state;
        const estimated = Number(this.estimate(downSliderVal).toFixed(3));
        onClick(downSliderVal, estimated);
    };


    render() {
        const {upSliderVal, downSliderVal, mode} = this.state;

        return (
            <>
                {mode === "up" && (
                    <div className="voting-controls voting-controls-up">
                        <div className="btn-vote btn-up-vote vote-btn-lg" onClick={this.upVoteClicked}>
                            <span className="btn-inner">{chevronUpSvg}</span>
                        </div>
                        <div className="estimated">
                            <FormattedCurrency {...this.props} value={this.estimate(upSliderVal)} fixAt={3}/>
                        </div>
                        <div className="slider slider-up">
                            <Form.Control
                                autoFocus={true}
                                type="range"
                                custom={true}
                                step={0.1}
                                min={0}
                                max={100}
                                value={upSliderVal}
                                onChange={this.upSliderChanged}
                            />
                        </div>
                        <div className="percentage">{`${upSliderVal.toFixed(1)}%`}</div>
                        <div
                            className="btn-vote btn-down-vote vote-btn-lg"
                            onClick={() => {
                                this.changeMode("down");
                            }}>
                            <span className="btn-inner">{chevronUpSvg}</span>
                        </div>
                    </div>
                )}

                {mode === "down" && (
                    <div className="voting-controls voting-controls-down">
                        <div
                            className="btn-vote btn-up-vote vote-btn-lg"
                            onClick={() => {
                                this.changeMode("up");
                            }}>
                            <span className="btn-inner">{chevronUpSvg}</span>
                        </div>
                        <div className="estimated">
                            <FormattedCurrency {...this.props} value={this.estimate(downSliderVal)} fixAt={3}/>
                        </div>
                        <div className="slider slider-down">
                            <Form.Control
                                type="range"
                                custom={true}
                                step={0.1}
                                min={-100}
                                max={-0.1}
                                value={downSliderVal}
                                onChange={this.downSliderChanged}
                            />
                        </div>
                        <div className="percentage">{`${downSliderVal.toFixed(1)}%`}</div>
                        <div className="btn-vote btn-down-vote vote-btn-lg" onClick={this.downVoteClicked}>
                            <span className="btn-inner">{chevronUpSvg}</span>
                        </div>
                    </div>
                )}
            </>
        );
    }
}

interface Props {
    //hiveEngineTokensProperties: unknown;
    prices: PriceHash;
    global: Global;
    dynamicProps: DynamicProps;
    entry: Entry;
    users: User[];
    activeUser: ActiveUser | null;
    ui: UI;
    setActiveUser: (username: string | null) => void;
    updateActiveUser: (data?: Account) => void;
    deleteUser: (username: string) => void;
    toggleUIProp: (what: ToggleType) => void;
    afterVote: (votes: EntryVote[], estimated: number) => void;
}

interface State {
    dialog: boolean;
    inProgress: boolean;
    priceHash: PriceHash;

}

export class EntryVoteBtn extends BaseComponent<Props, State> {
    state: State = {
        dialog: false,
        inProgress: false,
        priceHash: this.props.prices
    };

    vote = (percent: number, estimated: number) => {
        this.toggleDialog();

        const {entry, activeUser, afterVote, updateActiveUser} = this.props;
        const weight = Math.ceil(percent * 100);

        this.stateSet({inProgress: true});
        const username = activeUser?.username!;

        vote(username, entry.author, entry.permlink, weight)
            .then(() => {
                const votes: EntryVote[] = [
                    ...entry.active_votes.filter((x) => x.voter !== username),
                    {rshares: weight, voter: username}
                ];

                afterVote(votes, estimated);
                updateActiveUser(); // refresh voting power
            })
            .catch((e) => {
                error(formatError(e));
            })
            .finally(() => {
                this.stateSet({inProgress: false});
            });
    };

    isVoted = () => {
        const {activeUser} = this.props;

        if (!activeUser) {
            return {upVoted: false, downVoted: false};
        }

        const {active_votes: votes} = this.props.entry;

        const upVoted = votes.some((v) => v.voter === activeUser.username && v.rshares > 0);

        const downVoted = votes.some((v) => v.voter === activeUser.username && v.rshares < 0);

        return {upVoted, downVoted};
    };

    toggleDialog = () => {
        const {dialog} = this.state;
        this.stateSet({dialog: !dialog});
    };

    render() {
        const {activeUser} = this.props;
        const {dialog, inProgress} = this.state;
        const {upVoted, downVoted} = this.isVoted();

        let cls = _c(`btn-vote btn-up-vote ${inProgress ? "in-progress" : ""}`);

        if (upVoted || downVoted) {
            cls = _c(`btn-vote ${upVoted ? "btn-up-vote" : "btn-down-vote"} ${inProgress ? "in-progress" : ""} voted`);
        }

        return (
            <>
                {LoginRequired({
                    ...this.props,
                    children: <div className="entry-vote-btn" onClick={this.toggleDialog}>
                        <div className={cls}>
                            <span className="btn-inner">{chevronUpSvg}</span>
                        </div>
                    </div>
                })}

                {(dialog && activeUser) && (
                    <Modal className="vote-modal" onHide={this.toggleDialog} show={true} centered={true}
                           animation={false}>
                        <VoteDialog {...this.props} activeUser={activeUser} onClick={this.vote}/>
                    </Modal>
                )}
            </>
        );
    }
}


export default (p: Props) => {
    const props = {
        global: p.global,
        dynamicProps: p.dynamicProps,
        entry: p.entry,
        users: p.users,
        activeUser: p.activeUser,
        ui: p.ui,
        setActiveUser: p.setActiveUser,
        updateActiveUser: p.updateActiveUser,
        deleteUser: p.deleteUser,
        toggleUIProp: p.toggleUIProp,
        afterVote: p.afterVote,
        prices: p.prices,
        //hiveEngineTokensProperties: p.hiveEngineTokensProperties,
    }

    return <EntryVoteBtn {...props} />
}
