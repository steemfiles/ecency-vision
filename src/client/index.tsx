import React from "react";
import {hydrate} from "react-dom";
import {Provider} from "react-redux";
import {ConnectedRouter} from "connected-react-router";

import configureStore from "../common/store/configure";

import {hasKeyChainAct, setHiveEngineTokensProperties} from "../common/store/global";
import {clientStoreTasks} from "../common/store/helper";

import {history} from "../common/store";

import App from "../common/app";

import {AppWindow} from "./window";

import "../style/theme-day.scss";
import "../style/theme-night.scss";

import './base-handlers';
import {getPrices, getScotDataAsync, HiveEngineTokenConfig, HiveEngineTokenInfo} from "../common/api/hive-engine";
import {includeInfoConfigsAction} from "../common/store/hive-engine-tokens";
import {LIQUID_TOKEN_UPPERCASE} from "../client_config";

declare var window: AppWindow;

const store = configureStore(window["__PRELOADED_STATE__"]);

hydrate(
    <Provider store={store}>
        <ConnectedRouter history={history!}>
            <App/>
        </ConnectedRouter>
    </Provider>,
    document.getElementById("root")
);

clientStoreTasks(store);

window.addEventListener("load", () => {
	// Check & activate keychain support
    if (window.hive_keychain) {
        window.hive_keychain.requestHandshake(() => {
            store.dispatch(hasKeyChainAct());
        });
    } else {
		const hive_keychain_interval_id = setInterval(() => {
			if (window.hive_keychain) {
				window.hive_keychain.requestHandshake(() => {
					store.dispatch(hasKeyChainAct());
					clearInterval(hive_keychain_interval_id);
				});
			}
		}, 400);
		
		setTimeout(() => {
			clearInterval(hive_keychain_interval_id);
		}, 25000);    	
    }
    
    console.log("Getting HE data...");
    
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
	
		console.log("Setting HE data");
		store.dispatch(includeInfoConfigsAction({[LIQUID_TOKEN_UPPERCASE]: {config, info,
		hivePrice: price},}));
	
		});
    
});






if (module.hot) {
    module.hot.accept("../common/app", () => {
        hydrate(
            <Provider store={store}>
                <ConnectedRouter history={history!}>
                    <App/>
                </ConnectedRouter>
            </Provider>,
            document.getElementById("root")
        );
    });
}
