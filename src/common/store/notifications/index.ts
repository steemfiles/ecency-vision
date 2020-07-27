import {Dispatch} from "redux";

import {ActionTypes as ActiveUserActionTypes} from "../active-user/types"

import {
    Actions,
    ActionTypes,
    ApiNotification,
    FetchAction,
    FetchedAction,
    NFetchMode,
    NotificationFilter,
    Notifications,
    SetFilterAction,
    SetUnreadCountAction,
    MarkAction
} from "./types";

import {AppState} from "../index";

import {getNotifications, getUnreadNotificationCount, markNotifications as markNotificationsFn} from "../../api/private";

export const initialState: Notifications = {
    filter: null,
    unread: 0,
    list: [],
    inProgress: false,
    hasMore: true
};

export default (state: Notifications = initialState, action: Actions): Notifications => {
    switch (action.type) {
        case ActionTypes.FETCH: {
            switch (action.mode) {
                case NFetchMode.APPEND:
                    return {
                        ...state,
                        inProgress: true,
                    };
                case NFetchMode.REPLACE:
                    return {
                        ...state,
                        list: [],
                        inProgress: true,
                    };
                default:
                    return state;
            }
        }
        case ActionTypes.FETCHED: {
            const {list} = state;
            let newList: ApiNotification[] = []

            switch (action.mode) {
                case NFetchMode.APPEND:
                    newList = [...list, ...action.list];
                    break;
                case NFetchMode.REPLACE:
                    newList = [...action.list];
                    break;
            }

            return {
                ...state,
                inProgress: false,
                list: newList,
                hasMore: action.list.length === 50 // Api list size
            };
        }
        case ActiveUserActionTypes.LOGIN:
        case ActiveUserActionTypes.LOGOUT: {
            return {...initialState}
        }
        case ActionTypes.SET_FILTER: {
            return {
                ...state,
                list: [],
                hasMore: true,
                filter: action.filter
            };
        }
        case ActionTypes.SET_UNREAD_COUNT: {
            return {
                ...state,
                unread: action.count
            };
        }
        default:
            return state;
    }
}

/* Actions */
export const fetchNotifications = (since: string | null = null) => (dispatch: Dispatch, getState: () => AppState) => {

    if (since) {
        dispatch(fetchAct(NFetchMode.APPEND));
    } else {
        dispatch(fetchAct(NFetchMode.REPLACE));
    }

    const {notifications, activeUser, users} = getState();

    const {filter} = notifications;

    const user = users.find((x) => x.username === activeUser?.username)!;

    getNotifications(user, filter, since).then(r => {

        if (since) {
            dispatch(fetchedAct(r, NFetchMode.APPEND));
        } else {
            dispatch(fetchedAct(r, NFetchMode.REPLACE));
        }

    }).catch(() => {
        dispatch(fetchedAct([], NFetchMode.APPEND));
    });
}

export const fetchUnreadNotificationCount = () => (dispatch: Dispatch, getState: () => AppState) => {
    const {activeUser, users} = getState();

    const user = users.find((x) => x.username === activeUser?.username)!;

    getUnreadNotificationCount(user).then(count => {
        dispatch(setUnreadCountAct(count));
    })
}

export const setNotificationsFilter = (filter: NotificationFilter | null) => (dispatch: Dispatch) => {
    dispatch(setFilterAct(filter));
}

export const markNotifications = (id: string | null) => (dispatch: Dispatch, getState: () => AppState) => {
    const {notifications, activeUser, users} = getState();

    const user = users.find((x) => x.username === activeUser?.username)!;

    markNotificationsFn(user, id).then(() => {

    })
}

/* Action Creators */
export const fetchAct = (mode: NFetchMode): FetchAction => {
    return {
        type: ActionTypes.FETCH,
        mode
    };
};

export const fetchedAct = (list: ApiNotification[], mode: NFetchMode): FetchedAction => {
    return {
        type: ActionTypes.FETCHED,
        list,
        mode
    };
};

export const setFilterAct = (filter: NotificationFilter | null): SetFilterAction => {
    return {
        type: ActionTypes.SET_FILTER,
        filter
    };
};

export const setUnreadCountAct = (count: number): SetUnreadCountAction => {
    return {
        type: ActionTypes.SET_UNREAD_COUNT,
        count
    };
};

export const markAct = (id: string | null): MarkAction => {
    return {
        type: ActionTypes.MARK,
        id
    };
}
