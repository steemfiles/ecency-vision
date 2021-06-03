interface ScotVoteShare         {
    "authorperm": "",
    "block_num": null|undefined|number;
    "percent": null|undefined|number;
    "revoted": any;
    "rshares": null|undefined|number;
    "timestamp": null|undefined|string;
    "token": null|undefined|string;
    "voter": null|undefined|string;
    "weight": null|undefined|number;
}

interface ScotPost {
        "active_votes": Array<ScotVoteShare>,
        "app": null|undefined|string;
        "author": null|undefined|string;
        "author_curve_exponent": null|undefined|number;
        "author_payout_beneficiaries": null|undefined|string;
        "authorperm": null|undefined|string;
        "beneficiaries_payout_value": null|undefined|number;
        "block": null|undefined|number;
        "cashout_time": null|undefined|string;
        "children": null|undefined|number;
        "created": null|undefined|string;
        "curator_payout_value": null|undefined|number;
        "decline_payout": null|undefined|boolean;
        "desc": null|undefined|string;
        "hive": null|undefined|boolean;
        "json_metadata": null|undefined|string;
        "last_payout": null|undefined|string;
        "last_update": null|undefined|string;
        "main_post": null|undefined|boolean;
        "muted": null|undefined|boolean;
        "parent_author": "",
        "parent_permlink": null|undefined|string;
        "pending_token": null|undefined|number;
        "precision": null|undefined|number;
        "promoted": null|undefined|number;
        "score_hot": null|undefined|number;
        "score_promoted": null|undefined|number;
        "score_trend": null|undefined|number;
        "tags": null|undefined|string;
        "title": null|undefined|string;
        "token": null|undefined|string;
        "total_payout_value": null|undefined|number;
        "total_vote_weight": null|undefined|number;
        "vote_rshares": null|undefined|number;
}
