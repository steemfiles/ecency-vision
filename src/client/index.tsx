import React from "react";
import { hydrate } from "react-dom";
import { Provider } from "react-redux";
import { ConnectedRouter } from "connected-react-router";
import configureStore from "../common/store/configure";
import {
  hasKeyChainAct,
  setHiveEngineTokensProperties,
} from "../common/store/global";
import { clientStoreTasks } from "../common/store/helper";
import { history } from "../common/store";
import App from "../common/app";
import { AppWindow } from "./window";
import "../style/theme-day.scss";
import "../style/theme-night.scss";
import "./base-handlers";

import { includeInfoConfigsAction } from "../common/store/hive-engine-tokens";
import { LIQUID_TOKEN_UPPERCASE } from "../client_config";
declare var window: AppWindow;
const store = configureStore(window["__PRELOADED_STATE__"]);
hydrate(
  <Provider store={store}>
    <ConnectedRouter history={history!}>
      <App />
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
    try {
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
    } catch (e) {}
  }
});
if (module.hot) {
  module.hot.accept("../common/app", () => {
    hydrate(
      <Provider store={store}>
        <ConnectedRouter history={history!}>
          <App />
        </ConnectedRouter>
      </Provider>,
      document.getElementById("root")
    );
  });
}
