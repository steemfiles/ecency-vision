import React, {Component} from "react";

import {Form, FormControl, Modal} from "react-bootstrap";

import {Global} from "../../store/global/types";
import {Account} from "../../store/accounts/types";
import {Entry, EntryVote} from "../../store/entries/types";
import {User} from "../../store/users/types";
import {ActiveUser} from "../../store/active-user/types";
import {DynamicProps} from "../../store/dynamic-props/types";
import {ToggleType, UI} from "../../store/ui/types";
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
    getAccountHEFull, getPrices,
    getScotDataAsync, historicalPOBConfig, historicalPOBInfo,
    HiveEngineTokenConfig,
    HiveEngineTokenInfo,
    ScotPost,
    ScotVoteShare
} from "../../api/hive-engine";


import {LIQUID_TOKEN_UPPERCASE} from "../../../client_config";
import {PriceHash} from "../../store/prices/types";
import {includeInfoConfigs} from "../../store/hive-engine-tokens";
import {TokenPropertiesMap} from "../../store/hive-engine-tokens/types";
import {setHiveEngineTokensProperties} from "../../store/global";
import {is_not_FullHiveEngineAccount} from "../../api/hive-engine";

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

    tokenPriceInHive: null | number;
    tokenInfo: null | HiveEngineTokenInfo;
    tokenConfig: null | HiveEngineTokenConfig;

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

    account: null | FullHiveEngineAccount;
    tokenEntryMap: { [id: string]: ScotPost };
    voteInfo: VoteInfo;
    scotDenominator: number;
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
        scotDenominator: 100000000,
        account: null,
        tokenEntryMap: {
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


    componentDidMount() {
        const {activeUser, tokenInfo, tokenConfig, entry} = this.props;
        const setState = this.setState.bind(this);
        if (!tokenInfo || !tokenConfig) {
        	return;
        }       
        
		const scotDenominator = Math.pow(10, tokenInfo.precision);
		try {
            !activeUser.data["token_balances"] && console.log("user has no token balances");
			if (activeUser.data["token_balances"]) {
                const data : FullHiveEngineAccount = activeUser.data as FullHiveEngineAccount;
                const tokens_balances = data.token_balances;
                const tokens_statuses = data.token_statuses;
                const liquid_token_balances = tokens_balances.find( tB => tB.symbol === LIQUID_TOKEN_UPPERCASE);
                console.log("tokens_statuses.hiveData: ", tokens_statuses.hiveData);
                if (tokens_statuses.hiveData) {
                    const liquid_token_statuses = tokens_statuses.hiveData[LIQUID_TOKEN_UPPERCASE];
                    console.log({liquid_token_balances, liquid_token_statuses});
                    getScotDataAsync<ScotPost>(`@${entry.author}/${entry.permlink}?hive=1`, {}).then(
                        tokenEntryMap => {
                            console.log({tokenEntryMap});
                            setState({tokenEntryMap: tokenEntryMap});
                        }
                    );
                    setState({voteInfo: liquid_token_statuses, scotDenominator});
                }
            }


			
		} catch (e) {
		}
        
        
		Promise.all([
		getScotDataAsync<ScotPost>(`@${entry.author}/${entry.permlink}?hive=1`, {}),
		getScotDataAsync<{ [id: string]: VoteInfo }>(`@${activeUser.username}`, {
			token :  LIQUID_TOKEN_UPPERCASE,      hive: 1

		})]).
		then(function (value1: [{ [id: string]: ScotPost }, { [id: string]: VoteInfo }

		]) {

			
			const info = tokenInfo;
			const config = tokenConfig;
			const post = value1[0];

			const voteInfoHash = value1[1];
			let voteInfo: VoteInfo;

			if (is_not_FullHiveEngineAccount(value1[0])) {
				return;
			}			
			
			if (!voteInfoHash || !(voteInfo = voteInfoHash[LIQUID_TOKEN_UPPERCASE])) {
				console.log("Not setting Hive Engine parameters:", {voteInfoHash, account, info, config, post});

				return;

			}

			console.log("AccountInfo:", activeUser.data, "TokenInfo:", info, "config:", config, 'post:', post, {voteInfo});


			if (!post) {
				console.log("Not setting Hive Engine parameters:")

				return;

			}                
			setState({account: activeUser.data, tokenEntryMap: post, voteInfo, scotDenominator});

		});
    }

    applyRewardsCurve(r: number) {
        if (!this.props.tokenInfo || !this.props.tokenInfo.pending_rshares || !this.props.tokenConfig)
            return 0;
        return Math.pow(Math.max(0, r), this.props.tokenConfig.author_curve_exponent) *
            (this.props.tokenInfo.reward_pool as number) /
            (this.props.tokenInfo.pending_rshares as number) / this.state.scotDenominator;
    }


    estimate = (percent: number): number => {
        const {entry, activeUser, dynamicProps, global} = this.props;


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
        if (this.props.tokenConfig && this.props.tokenInfo && this.props.tokenPriceInHive &&
            this.state.tokenEntryMap && this.state.voteInfo
        ) {
            const currentVp = this.state.voteInfo.voting_power / 100;
            console.log({userVotingPower, currentVp, "voteInfo.voting_power": this.state.voteInfo.voting_power});
            let pendingTokenPayoutBeforeVote = 0;
            let scot_total_author_payout = 0;
            let scot_total_curator_payout = 0;
            let scot_token_bene_payout = 0;
            let payout = 0;
            const up = this.state.mode === 'up';
            const scotData = this.state.tokenEntryMap[LIQUID_TOKEN_UPPERCASE];
            const {tokenInfo, tokenConfig, tokenPriceInHive} = this.props;
            if (!tokenConfig || !tokenInfo) {
                console.log("bailing early because of " + ((!tokenConfig && "no tokenConfig. ") || "") +
                    ((!tokenInfo && "no tokenInfo. ") || ""));
                return dollarValueFromHive;
            }

            //console.log("post entry:", entry);
            const cashout_time = Date.parse(entry.created) + tokenConfig.cashout_window_days * 24 * 3600 * 1000;
            const cashout_active: boolean = cashout_time > (new Date()).getTime();
            //console.log("token Info:", this.state.tokenInfo);
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

            //if (!cashout_active) {
                // bailing out here because the post is not eligible for rewards at all.
                //return 0;
            //}

            const SA = token_balances.map(tb => ({symbol: tb.symbol, stake: tb.stake + tb.delegationsIn}));
            let SH = {};
            for (const s of SA) {
                SH[s.symbol] = s.stake;
            }
            if (!(this.props.tokenInfo.reward_pool && this.props.tokenInfo.pending_rshares && this.props.tokenInfo.precision && this.props.tokenInfo.pending_token)) {
                console.log("Returning early",
                    "reward_pool:", !!this.props.tokenInfo.reward_pool,
                    "pending_rshares:", !!this.props.tokenInfo.pending_rshares,
                    "precision:", !!this.props.tokenInfo.precision,
                    "pending_token:", !!this.props.tokenInfo.pending_token,
                    "currentVP:", currentVp
                );
                if (!this.state.tokenEntryMap) {
                    console.log("tokenEntryMap:", false);
                } else {
                    console.log("tokenEntryMap.POB", this.state.tokenEntryMap[LIQUID_TOKEN_UPPERCASE]);
                }
                return dollarValueFromHive;
            }

            console.log("account Info:", this.state.account);
            console.log("token Info:", this.props.tokenInfo);
            const usersFullUpVoteRShares = this.props.tokenInfo.pending_rshares / this.props.tokenInfo.staked_token
                * (liquid_balance.stake + liquid_balance.delegationsIn - liquid_balance.delegationsOut);// .staked_tokens;
            console.log(usersFullUpVoteRShares);


            const applyRewardsCurve = this.applyRewardsCurve.bind(this);
            const active_votes: Array<ScotVoteShare> = this.state.tokenEntryMap[LIQUID_TOKEN_UPPERCASE] ?
                this.state.tokenEntryMap[LIQUID_TOKEN_UPPERCASE].active_votes
                : [];
            console.log({active_votes});
            const rsharesTotal = active_votes
                .map(x => x.rshares)
                .reduce((x, y) => x + y, 0);
            console.log("rshares total ", rsharesTotal);


            const scotDenominator = this.state.scotDenominator;
            pendingTokenPayoutBeforeVote = applyRewardsCurve(rsharesTotal);

            if (scotDenominator === 0) {
                // should never happen unless there are bugs outside.
                console.log("scotDenominator set wrong");
                return dollarValueFromHive;
            }
            console.log(scotData);
            console.log({pendingTokenPayoutBeforeVote});
            if (scotData) {
                // This data is available only when a post has been voted on by someone staking the
                // Hive token.
                scot_total_curator_payout = (scotData['curator_payout_value'] || 0) / scotDenominator;
                scot_total_author_payout = (scotData['total_payout_value'] || 0) / scotDenominator;
                scot_token_bene_payout = (scotData['beneficiaries_payout_value'] || 0) / scotDenominator;

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
            console.log(this.props.tokenInfo);
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
            console.log(tokenPriceInHive, "HIVE/POB", base / quote, "$/HIVE")
            dollarValueFromPOB = valueEst * tokenPriceInHive * base / quote;
        }

        console.log("global.HETP:", global.hiveEngineTokensProperties); 
        return dollarValueFromHive + dollarValueFromPOB;
    };


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
    hiveEngineTokensProperties: TokenPropertiesMap;
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
    hiveEngineTokenHivePrice?: number;
    hiveEngineTokenInfo?: HiveEngineTokenInfo;
    hiveEngineTokenConfig?: HiveEngineTokenConfig;
}

interface State {
    dialog: boolean;
    inProgress: boolean;
    tokenPriceInHive: null | number;
    tokenInfo: null | HiveEngineTokenInfo;
    tokenConfig: null | HiveEngineTokenConfig;
    lastLoad: number;

}

export class EntryVoteBtn extends BaseComponent<Props, State> {
    public static tokenPriceInHive:number = 1;
    public static tokenInfo: HiveEngineTokenInfo = historicalPOBInfo;
    public static tokenConfig: HiveEngineTokenConfig = historicalPOBConfig;
    public static  lastLoad : number = 0;

    state: State = {
        dialog: false,
        inProgress: false,
        tokenPriceInHive: EntryVoteBtn.tokenPriceInHive,
        tokenInfo: EntryVoteBtn.tokenInfo,
        tokenConfig: EntryVoteBtn.tokenConfig,
        lastLoad: 0,
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


    componentDidMount() {
        console.log(this.props.hiveEngineTokensProperties);

        const setState = this.setState.bind(this);
        const tokenConfig = this.props.hiveEngineTokenConfig;
        const tokenInfo = this.props.hiveEngineTokenInfo;
        {
            let tokensProperties : any;
            let properties;
            if (
                ((tokensProperties=this.props.hiveEngineTokensProperties) ||
                (tokensProperties=this.props.global.hiveEngineTokensProperties))
                    &&
                (properties = tokensProperties[LIQUID_TOKEN_UPPERCASE])
            )   {
                // if my redux works use this:

                if (this.props.global.hiveEngineTokensProperties)
                    console.log("Properties set in global!");
                this.setState({
                    tokenInfo: properties.info || EntryVoteBtn.tokenInfo,
                    tokenConfig: properties.config || EntryVoteBtn.tokenConfig,
                    tokenPriceInHive: properties.hivePrice ?? EntryVoteBtn.tokenPriceInHive,
                    lastLoad: (new Date()).getTime()
                });

                // store to static members
                EntryVoteBtn.lastLoad = (new Date()).getTime();
                EntryVoteBtn.tokenPriceInHive = properties.hivePrice ?? EntryVoteBtn.tokenPriceInHive;
                EntryVoteBtn.tokenInfo = properties.info || EntryVoteBtn.tokenInfo;
                EntryVoteBtn.tokenConfig = properties.config || EntryVoteBtn.tokenConfig;
            } else {
                // if not, start with the static variable
                this.setState({
                    tokenInfo: EntryVoteBtn.tokenInfo,
                    tokenConfig: EntryVoteBtn.tokenConfig,
                    tokenPriceInHive: EntryVoteBtn.tokenPriceInHive
                });
            }
        }
        if ((EntryVoteBtn.lastLoad+10000 < (new Date()).getTime())) {
        	console.log("Loading new HE parameters");
			Promise.all([
				getScotDataAsync<HiveEngineTokenInfo>('info', {token: LIQUID_TOKEN_UPPERCASE,}),
				getScotDataAsync<HiveEngineTokenConfig>('config', {token: LIQUID_TOKEN_UPPERCASE,}),
				getPrices(undefined)]).then(function (values: [HiveEngineTokenInfo,
				HiveEngineTokenConfig,
				{ [id: string]: number }
			]) {
				const info = values[0];
				const config = values[1];
				const prices = values[2];
				if (!info || !config || !prices) {
					console.log("Not setting Hive Engine parameters:")
					return;
				}
				const price : number = prices[LIQUID_TOKEN_UPPERCASE] || 0;
				if (!price) {
					console.log("Not setting Hive Engine parameters:")
					return;
				}
				EntryVoteBtn.lastLoad = (new Date()).getTime();
				EntryVoteBtn.tokenPriceInHive = price;
				EntryVoteBtn.tokenInfo = info;
				EntryVoteBtn.tokenConfig = config;
				setState({tokenInfo: info, tokenConfig: config, tokenPriceInHive: price, lastLoad: (new Date()).getTime()});
				setHiveEngineTokensProperties({[LIQUID_TOKEN_UPPERCASE]: {config: tokenConfig, info: tokenInfo,
						hivePrice: price}});
			});
        } else {
            console.log("Not reloading HE parameters for another ", ((EntryVoteBtn.lastLoad+10000 - (new Date()).getTime())), "seconds.");
        }
    }


    render() {
        const {activeUser} = this.props;
        const {dialog, inProgress} = this.state;
        const {upVoted, downVoted} = this.isVoted();
        let tokensProperties, properties;
        let tokenPriceInHive : number = 0;
        let cls = _c(`btn-vote btn-up-vote ${inProgress ? "in-progress" : ""}`);

        if (upVoted || downVoted) {
            cls = _c(`btn-vote ${upVoted ? "btn-up-vote" : "btn-down-vote"} ${inProgress ? "in-progress" : ""} voted`);
        }
        
        let {tokenInfo, tokenConfig} = this.state;
        tokenPriceInHive = this.state.tokenPriceInHive || 0;
		if (
			((tokensProperties=this.props.hiveEngineTokensProperties) ||
			(tokensProperties=this.props.global.hiveEngineTokensProperties))
				&&
			(properties = tokensProperties[LIQUID_TOKEN_UPPERCASE])
		)   {
			// if my redux works use this:
			
			if (properties.info && properties.config && properties.hivePrice) {
				tokenInfo = properties.info;
				tokenConfig = properties.config;
				tokenPriceInHive = properties.hivePrice || 0;
			}
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
                        <VoteDialog {...this.props} tokenPriceInHive={tokenPriceInHive}
                                    tokenInfo={tokenInfo} tokenConfig={tokenConfig}
                                    activeUser={activeUser} onClick={this.vote}/>
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
        hiveEngineTokensProperties: p.hiveEngineTokensProperties,
    }

    return <EntryVoteBtn {...props} />
}
