import {Account} from "../accounts/types";
import {TokenBalance} from "../../api/hive-engine";

export interface UserPoints {
    points: string;
    uPoints: string;
}

export interface ActiveUser {
    username: string;
    data: Account;
    points: UserPoints;
    hiveEngineBalances: Array<TokenBalance>;
}

export enum ActionTypes {
    LOGIN = "@active-user/LOGIN",
    LOGOUT = "@active-user/LOGOUT",
    UPDATE = "@active-user/UPDATE",
}

export interface LoginAction {
    type: ActionTypes.LOGIN;
}

export interface LogoutAction {
    type: ActionTypes.LOGOUT;
}

export interface UpdateAction {
    type: ActionTypes.UPDATE;
    data: Account;
    points: UserPoints;
    hiveEngineBalances: Array<TokenBalance>;
}

export type Actions = LoginAction | LogoutAction | UpdateAction;
