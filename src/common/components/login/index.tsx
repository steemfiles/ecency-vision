import React, { Component, MouseEvent } from "react";

import { Modal, Form, Button, FormControl, Spinner } from "react-bootstrap";

import isEqual from "react-fast-compare";

import { PrivateKey, PublicKey, cryptoUtils } from "@hiveio/dhive";

import { History, Location } from "history";
import * as ls from "../../util/local-storage";

import { AppWindow } from "../../../client/window";

import { Global } from "../../store/global/types";
import { UI } from "../../store/ui/types";
import { User } from "../../store/users/types";
import { Account } from "../../store/accounts/types";
import { ActiveUser } from "../../store/active-user/types";
import { ToggleType } from "../../store/ui/types";

import BaseComponent from "../base";
import UserAvatar from "../user-avatar";
import Tooltip from "../tooltip";
import PopoverConfirm from "../popover-confirm";
import OrDivider from "../or-divider";
import { error } from "../feedback";

import { getAuthUrl, makeHsCode } from "../../helper/hive-signer";
import { hsLogin } from "../../../desktop/app/helper/hive-signer";

import { client, getAccount } from "../../api/hive";
import { usrActivity } from "../../api/private-api";
import { hsTokenRenew } from "../../api/auth-api";
import { formatError, grantPostingPermission, revokePostingPermission } from "../../api/operations";

import { getRefreshToken } from "../../helper/user-token";

import { addAccountAuthority, removeAccountAuthority, signBuffer } from "../../helper/keychain";
import { logUser } from "../../helper/log-user";
import { _t } from "../../i18n";

import _c from "../../util/fix-class-names";

import { deleteForeverSvg } from "../../img/svg";
import { Html5QrcodeScanner, Html5QrcodeResult } from "html5-qrcode";

declare var window: AppWindow;

interface LoginKcProps {
  history: History;
  toggleUIProp: (what: ToggleType) => void;
  setActiveUser: (username: string | null) => void;
  deleteUser: (username: string) => void;
  doLogin: (
    hsCode: string,
    postingKey: null | undefined | string,
    account: Account
  ) => Promise<void>;
  global: Global;
  userListRef?: any;
  activeUser: ActiveUser | null;
  users: User[];
}

interface LoginKcState {
  username: string;
  inProgress: boolean;
}

export class LoginKc extends BaseComponent<LoginKcProps, LoginKcState> {
  state: LoginKcState = {
    username: "",
    inProgress: false
  };

  usernameChanged = (e: React.ChangeEvent<typeof FormControl & HTMLInputElement>): void => {
    const { value: username } = e.target;
    this.stateSet({ username: username.trim().toLowerCase() });
  };

  inputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      this.login().then();
    }
  };

  hide = () => {
    const { toggleUIProp } = this.props;
    toggleUIProp("login");
  };

  userSelect = (user: User) => {
    const { doLogin } = this.props;

    this.stateSet({ inProgress: true });

    getAccount(user.username)
      .then((account) => {
        let token = getRefreshToken(user.username);

        if (!token) {
          error(`${_t("login.error-user-not-found-cache")}`);
        }
        return token ? doLogin(token, user.postingKey, account) : this.userDelete(user);
      })
      .then(() => {
        this.hide();
        let shouldShowTutorialJourney = ls.get(`${user.username}HadTutorial`);

        if (
          !shouldShowTutorialJourney &&
          shouldShowTutorialJourney &&
          shouldShowTutorialJourney !== "true"
        ) {
          ls.set(`${user.username}HadTutorial`, "false");
        }
      })
      .catch(() => {
        error(_t("g.server-error"));
      })
      .finally(() => {
        this.stateSet({ inProgress: false });
      });
  };

  userDelete = (user: User) => {
    const { activeUser, deleteUser, setActiveUser } = this.props;
    deleteUser(user.username);

    // logout if active user
    if (activeUser && user.username === activeUser.username) {
      setActiveUser(null);
    }
  };
  login = async () => {
    const { hsClientId } = this.props.global;
    const { username } = this.state;
    if (!username) {
      return;
    }

    let account: Account;

    this.stateSet({ inProgress: true });

    try {
      account = await getAccount(username);
    } catch (err) {
      error(_t("login.error-user-fetch"));
      return;
    } finally {
      this.stateSet({ inProgress: false });
    }

    if (!(account && account.name === username)) {
      error(_t("login.error-user-not-found"));
      return;
    }

    const hasPostingPerm =
      account?.posting!.account_auths.filter((x) => x[0] === hsClientId).length > 0;

    if (!hasPostingPerm) {
      const weight = account.posting!.weight_threshold;

      this.stateSet({ inProgress: true });
      try {
        await addAccountAuthority(username, hsClientId, "Posting", weight);
      } catch (err) {
        error(_t("login.error-permission"));
        return;
      } finally {
        this.stateSet({ inProgress: false });
      }
    }

    this.stateSet({ inProgress: true });

    const signer = (message: string): Promise<string> =>
      signBuffer(username, message, "Active").then((r) => r.result);

    let code: string;
    try {
      code = await makeHsCode(hsClientId, username, signer);
    } catch (err) {
      error(formatError(err));
      this.stateSet({ inProgress: false });
      return;
    }

    const { doLogin } = this.props;

    doLogin(code, null, account)
      .then(() => {
        this.hide();
      })
      .catch(() => {
        error(_t("g.server-error"));
      })
      .finally(() => {
        this.stateSet({ inProgress: false });
      });
  };

  hsLogin = () => {
    const { global, history } = this.props;
    const { hsClientId } = global;
    if (global.isElectron) {
      hsLogin(hsClientId)
        .then((r) => {
          this.hide();
          history.push(`/auth?code=${r.code}`);
        })
        .catch((e) => {
          error(e);
        });
      return;
    }

    window.location.href = getAuthUrl(hsClientId);
  };

  back = () => {
    const { toggleUIProp } = this.props;
    toggleUIProp("loginKc");
  };

  render() {
    const { username, inProgress } = this.state;
    const { global } = this.props;

    const { users, userListRef } = this.props;
    const logo = global.isElectron ? "./img/logo-circle.svg" : require("../../img/logo-circle.svg");

    const hsLogo = global.isElectron
      ? "./img/hive-signer.svg"
      : require("../../img/hive-signer.svg");

    const keyChainLogo = global.isElectron
      ? "./img/keychain.png"
      : require("../../img/keychain.png");

    const spinner = (
      <Spinner animation="grow" variant="light" size="sm" style={{ marginRight: "6px" }} />
    );

    return (
      <>
        {users.length === 0 && (
          <div className="dialog-header">
            <img src={logo} alt="Logo" />
            <h2>{_t("login.title")}</h2>
          </div>
        )}

        {users.length > 0 && (
          <>
            <div className="user-list" ref={userListRef}>
              <div className="user-list-header">{_t("g.login-as")}</div>
              <div className="user-list-body">
                {users.map((u) => {
                  return (
                    <UserItem
                      key={u.username}
                      {...this.props}
                      disabled={inProgress}
                      user={u}
                      onSelect={this.userSelect}
                      onDelete={this.userDelete}
                      containerRef={userListRef}
                    />
                  );
                })}
              </div>
            </div>
            <OrDivider />
          </>
        )}

        <div className="dialog-header">
          <img src={keyChainLogo} alt="Logo" />
          <h2>{_t("login.with-keychain")}</h2>
        </div>

        <Form
          className="login-form"
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
          }}
        >
          <Form.Group>
            <Form.Control
              type="text"
              value={username}
              onChange={this.usernameChanged}
              placeholder={_t("login.username-placeholder")}
              autoFocus={true}
              onKeyDown={this.inputKeyDown}
            />
          </Form.Group>
          <Button
            disabled={inProgress || username.length < 3 || username.length > 16}
            block={true}
            onClick={this.login}
          >
            {inProgress && spinner}
            {_t("g.login")}
          </Button>
          <OrDivider />
          <div className="hs-login">
            <a
              className={_c(`btn btn-outline-primary ${inProgress ? "disabled" : ""}`)}
              onClick={this.back}
            >
              login with a password or private key
            </a>
          </div>
          <div className="hs-login">
            <a
              className={_c(`btn btn-outline-primary ${inProgress ? "disabled" : ""}`)}
              onClick={this.hsLogin}
            >
              <img
                src={global.isElectron ? "./img/hive-signer.svg" : hsLogo}
                className="hs-logo"
                alt="hivesigner"
              />{" "}
              {_t("login.with-hive-signer")}
            </a>
          </div>
        </Form>
      </>
    );
  }
}

interface UserItemProps {
  global: Global;
  user: User;
  activeUser: ActiveUser | null;
  disabled: boolean;
  onSelect: (user: User) => void;
  onDelete: (user: User) => void;
  containerRef?: React.RefObject<HTMLInputElement>;
}

export class UserItem extends Component<UserItemProps> {
  render() {
    const { user, activeUser, disabled, containerRef } = this.props;

    return (
      <div
        className={_c(
          `user-list-item ${disabled ? "disabled" : ""} ${
            activeUser && activeUser.username === user.username ? "active" : ""
          }`
        )}
        onClick={() => {
          const { onSelect } = this.props;
          onSelect(user);
        }}
      >
        {UserAvatar({ ...this.props, username: user.username, size: "medium" })}
        <span className="username">@{user.username}</span>
        {activeUser && activeUser.username === user.username && <div className="check-mark" />}
        <div className="flex-spacer" />
        <PopoverConfirm
          onConfirm={() => {
            const { onDelete } = this.props;
            onDelete(user);
          }}
          placement="left"
          trigger="click"
          containerRef={containerRef}
        >
          <div
            className="btn-delete"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Tooltip content={_t("g.delete")}>
              <span>{deleteForeverSvg}</span>
            </Tooltip>
          </div>
        </PopoverConfirm>
      </div>
    );
  }
}

interface LoginProps {
  history: History;
  global: Global;
  users: User[];
  activeUser: ActiveUser | null;
  setActiveUser: (username: string | null) => void;
  deleteUser: (username: string) => void;
  toggleUIProp: (what: ToggleType) => void;
  doLogin: (
    hsCode: string,
    postingKey: null | undefined | string,
    account: Account
  ) => Promise<void>;
  userListRef?: any;
}

interface State {
  username: string;
  key: string;
  inProgress: boolean;
  quickReliablePreviewVisible: boolean;
  quickReliablePreviewSetup: boolean;
}

export class Login extends BaseComponent<LoginProps, State> {
  state: State = {
    username: "",
    key: "",
    inProgress: false,
    quickReliablePreviewVisible: false,
    quickReliablePreviewSetup: false
  };

  html5QrcodeScanner: undefined | Html5QrcodeScanner = undefined;

  shouldComponentUpdate(nextProps: Readonly<LoginProps>, nextState: Readonly<State>): boolean {
    return (
      !isEqual(this.props.users, nextProps.users) ||
      !isEqual(this.props.activeUser, nextProps.activeUser) ||
      !isEqual(this.state, nextState)
    );
  }

  hide = () => {
    const { toggleUIProp } = this.props;
    this.stateSet({ quickReliablePreviewVisible: false });
    toggleUIProp("login");
  };

  userSelect = (user: User) => {
    const { doLogin } = this.props;

    this.stateSet({ inProgress: true });

    getAccount(user.username)
      .then((account) => {
        let token = getRefreshToken(user.username);
        if (!token) {
          error(`${_t("login.error-user-not-found-cache")}`);
        }
        return token ? doLogin(token, user.postingKey, account) : this.userDelete(user);
      })
      .then(() => {
        this.hide();
        let shouldShowTutorialJourney = ls.get(`${user.username}HadTutorial`);

        if (
          !shouldShowTutorialJourney &&
          shouldShowTutorialJourney &&
          shouldShowTutorialJourney !== "true"
        ) {
          ls.set(`${user.username}HadTutorial`, "false");
        }
      })
      .catch(() => {
        error(_t("g.server-error"));
      })
      .finally(() => {
        this.stateSet({ inProgress: false });
      });
  };

  userDelete = (user: User) => {
    const { activeUser, deleteUser, setActiveUser } = this.props;
    deleteUser(user.username);

    // logout if active user
    if (activeUser && user.username === activeUser.username) {
      setActiveUser(null);
    }
  };

  usernameChanged = (e: React.ChangeEvent<typeof FormControl & HTMLInputElement>): void => {
    const { value: username } = e.target;
    this.stateSet({ username: username.trim().toLowerCase() });
  };

  keyChanged = (e: React.ChangeEvent<typeof FormControl & HTMLInputElement>): void => {
    const { value: key } = e.target;
    this.stateSet({ key: key.trim() });
  };

  inputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      this.login().then();
    }
  };

  hsLogin = () => {
    const { global, history } = this.props;
    const { hsClientId } = global;
    if (global.isElectron) {
      hsLogin(hsClientId)
        .then((r) => {
          this.hide();
          history.push(`/auth?code=${r.code}`);
        })
        .catch((e) => {
          error(e);
        });
      return;
    }

    window.location.href = getAuthUrl(hsClientId);
  };

  kcLogin = () => {
    const { toggleUIProp } = this.props;
    toggleUIProp("loginKc");
  };

  login = async () => {
    const { hsClientId } = this.props.global;
    const { username, key, quickReliablePreviewVisible } = this.state;

    if (username === "" || key === "") {
      error(_t("login.error-fields-required"));
      return;
    }
    // Warn if the code is a public key
    try {
      PublicKey.fromString(key);
      error(_t("login.error-public-key"));
      return;
    } catch (e) {}

    let account: Account;

    this.stateSet({ inProgress: true });

    try {
      account = await getAccount(username);
    } catch (err) {
      error(_t("login.error-user-fetch"));
      return;
    } finally {
      this.stateSet({ inProgress: false });
    }

    if (!(account && account.name === username)) {
      error(_t("login.error-user-not-found"));
      return;
    }

    // Posting public key of the account
    const postingPublic = account?.posting!.key_auths.map((x) => x[0]);

    const isPlainPassword = !cryptoUtils.isWif(key);

    let thePrivateKey: PrivateKey;

    // Whether using posting private key to login
    let withPostingKey = false;

    if (
      !isPlainPassword &&
      postingPublic.includes(PrivateKey.fromString(key).createPublic().toString())
    ) {
      // Login with posting private key
      withPostingKey = true;
      thePrivateKey = PrivateKey.fromString(key);
    } else {
      // Login with master or active private key
      // Get active private key from user entered code
      if (isPlainPassword) {
        thePrivateKey = PrivateKey.fromLogin(account.name, key, "active");
      } else {
        thePrivateKey = PrivateKey.fromString(key);
      }

      // Generate public key from the private key
      const activePublicInput = thePrivateKey.createPublic().toString();

      // Active public key of the account
      const activePublic = account?.active!.key_auths.map((x) => x[0]);

      // Compare keys
      if (!activePublic.includes(activePublicInput)) {
        error(_t("login.error-authenticate")); // enter master or active key
        return;
      }

      const hasPostingPerm =
        account?.posting!.account_auths.filter((x) => x[0] === hsClientId).length > 0;

      if (!hasPostingPerm) {
        this.stateSet({ inProgress: true });
        try {
          await grantPostingPermission(thePrivateKey, account, hsClientId);
        } catch (err) {
          error(_t("login.error-permission"));
          return;
        } finally {
          this.stateSet({ inProgress: false });
        }
      }
    }

    // Prepare hivesigner code
    const signer = (message: string): Promise<string> => {
      const hash = cryptoUtils.sha256(message);
      return new Promise<string>((resolve) => resolve(thePrivateKey.sign(hash).toString()));
    };
    const code = await makeHsCode(hsClientId, account.name, signer);

    this.stateSet({ inProgress: true });

    const { doLogin } = this.props;

    doLogin(code, withPostingKey ? key : null, account)
      .then(this.handleDoLogin.bind(this, username))
      .catch(() => {
        error(_t("g.server-error"));
      })
      .finally(() => {
        this.stateSet({ inProgress: false });
      });
  };

  handleDoLogin = (username: string) => {
    if (
      !ls.get(`${username}HadTutorial`) ||
      (ls.get(`${username}HadTutorial`) && ls.get(`${username}HadTutorial`) !== "true")
    ) {
      ls.set(`${username}HadTutorial`, "false");
    }

    let shouldShowTutorialJourney = ls.get(`${username}HadTutorial`);

    if (
      !shouldShowTutorialJourney &&
      shouldShowTutorialJourney &&
      shouldShowTutorialJourney === "false"
    ) {
      ls.set(`${username}HadTutorial`, "false");
    }

    if (this.html5QrcodeScanner) {
      this.html5QrcodeScanner.clear();
    }

    this.hide();
  };

  hideQRPreview = (e: MouseEvent<typeof FormControl & HTMLInputElement>): void => {
    if (this.state.quickReliablePreviewSetup === false) return;
    const scanner = this.html5QrcodeScanner;
    if (this.state.quickReliablePreviewVisible === true && scanner) {
      this.setState((old_state: State) => {
        if (!old_state.quickReliablePreviewVisible) return old_state;
        try {
          scanner.pause();
        } catch (emessage: string) {
          console.error(emessage);
        } finally {
          return { ...old_state, quickReliablePreviewVisible: false };
        }
      });
    } // if
  };

  showQRPreview = (e: MouseEvent<typeof FormControl & HTMLInputElement>): void => {
    const { hsClientId } = this.props.global;
    const { quickReliablePreviewSetup, quickReliablePreviewVisible } = this.state;
    if (quickReliablePreviewVisible) {
      return;
    } else if (quickReliablePreviewSetup) {
      const scanner = this.html5QrcodeScanner;
      if (scanner) {
        this.stateSet((old_state: State) => {
          if (old_state.quickReliablePreviewVisible) return old_state;
          try {
            scanner.resume();
          } catch (emessage: string) {
            console.error(emessage);
          } finally {
            return { ...old_state, quickReliablePreviewVisible: true };
          }
        });
      }
    } else {
      this.stateSet({ quickReliablePreviewVisible: true, quickReliablePreviewSetup: true });

      if (!navigator.mediaDevices.getUserMedia) {
        console.log("media devices not supported");
        return;
      }

      const onScanSuccess = (decodedText: string, decodedResult: Html5QrcodeResult) => {
        // handle the scanned code as you like, for example:
        const privateKeyString = decodedText.trim();
        const handleFailure = () =>
          this.setState({ key: privateKeyString, quickReliablePreviewVisible: false });
        // setting the username leaves the login button disabled (why?).
        try {
          const privateKeyObject = PrivateKey.fromString(privateKeyString);
          const publicKeyObject = privateKeyObject.createPublic();
          const publicKeyString = publicKeyObject.toString();
          console.log("line 671:", { publicKeyString });
          // still in development:          //getKeyReferences({"keys": [publicKey]})
          client
            .call("account_by_key_api", "get_key_references", { keys: [publicKeyString] })
            .then(async (result: { accounts: string[][] }) => {
              console.log("line 675:", result);
              if (result.accounts.length == 0) {
                handleFailure();
                error("Invalid return value from server.");
              } else {
                const usernamesForFirstKey: string[] = result.accounts[0];
                if (usernamesForFirstKey.length === 0) {
                  handleFailure();
                  error("No user for this key");
                } else if (usernamesForFirstKey.length > 1) {
                  handleFailure();
                  error("More than one user for this key");
                } else {
                  const firstUsername: string = usernamesForFirstKey[0];

                  let account: Account;

                  this.stateSet({
                    key: privateKeyString,
                    quickReliablePreviewVisible: false,
                    inProgress: true,
                    username: firstUsername
                  });

                  try {
                    console.log({ username: firstUsername });
                    account = await getAccount(firstUsername);
                  } catch (err) {
                    this.stateSet({ inProgress: false });
                    error(_t("login.error-user-fetch"));
                    return;
                  }

                  // Prepare hivesigner code
                  const signer = (message: string): Promise<string> => {
                    const hash = cryptoUtils.sha256(message);
                    return new Promise<string>((resolve) =>
                      resolve(privateKeyObject.sign(hash).toString())
                    );
                  };
                  const code = await makeHsCode(hsClientId, firstUsername, signer);

                  const { doLogin } = this.props;

                  doLogin(code, privateKeyString, account)
                    .then(this.handleDoLogin.bind(this, firstUsername))
                    .catch(() => {
                      error(_t("g.server-error"));
                    })
                    .finally(() => {
                      this.stateSet({ inProgress: false });
                    });
                }
              }
            })
            .catch((e) => {
              console.log(685, e);
              handleFailure();
            });
        } catch (e) {
          console.log("689", e);
          if (typeof e.message == "string") {
            error(e.message);
          }
        }
      };

      function onScanFailure(error: string) {
        // handle scan failure, usually better to ignore and keep scanning.
        // for example:
        // doing nothing
      }

      this.html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      this.html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    }
  };

  render() {
    const { username, key, inProgress, quickReliablePreviewVisible } = this.state;
    const { users, activeUser, global, userListRef } = this.props;
    const isEcency = false;
    const logo = global.isElectron ? "./img/logo-circle.svg" : require("../../img/logo-circle.svg");
    const hsLogo = global.isElectron
      ? "./img/hive-signer.svg"
      : require("../../img/hive-signer.svg");
    const keyChainLogo = global.isElectron
      ? "./img/keychain.png"
      : require("../../img/keychain.png");

    const spinner = (
      <Spinner animation="grow" variant="light" size="sm" style={{ marginRight: "6px" }} />
    );

    return (
      <>
        {users.length === 0 && (
          <div className="dialog-header">
            <img src={logo} alt="Logo" />
            <h2>{_t("login.title")}</h2>
          </div>
        )}

        {users.length > 0 && (
          <>
            <div className="user-list" ref={userListRef}>
              <div className="user-list-header">{_t("g.login-as")}</div>
              <div className="user-list-body">
                {users.map((u) => {
                  return (
                    <UserItem
                      key={u.username}
                      {...this.props}
                      disabled={inProgress}
                      user={u}
                      onSelect={this.userSelect}
                      onDelete={this.userDelete}
                      containerRef={userListRef}
                    />
                  );
                })}
              </div>
            </div>
            <OrDivider />
          </>
        )}

        <Form
          className="login-form"
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
          }}
        >
          <p className="login-form-text">{_t("login.with-user-pass")}</p>
          <Form.Group>
            <Form.Control
              type="text"
              value={username}
              onChange={this.usernameChanged}
              placeholder={_t("login.username-placeholder")}
              autoFocus={true}
              onKeyDown={this.inputKeyDown}
            />
          </Form.Group>
          <Form.Group>
            <div style={{ display: "flex", flexDirection: "row" }}>
              <Form.Control
                type="password"
                value={key}
                autoComplete="off"
                onChange={this.keyChanged}
                placeholder={_t("login.key-placeholder")}
                onKeyDown={this.inputKeyDown}
                style={{ display: quickReliablePreviewVisible ? "none" : "inherit" }}
              />
              {navigator.mediaDevices.getUserMedia && !quickReliablePreviewVisible && (
                <Button onClick={this.showQRPreview}>QR</Button>
              )}
            </div>
            <div style={{ display: quickReliablePreviewVisible ? "inherit" : "none" }}>
              <div id="reader" />
              <Button onClick={this.hideQRPreview}>Type password</Button>
            </div>
          </Form.Group>
          <p className="login-form-text">
            {_t("login.login-info-1")}{" "}
            <a
              onClick={(e) => {
                e.preventDefault();
                this.hide();
                const { history } = this.props;
                history.push("/faq#how-to-signin");
                setTimeout(() => {
                  const el = document.getElementById("how-to-signin");
                  if (el) el.scrollIntoView();
                }, 300);
              }}
              href="#"
            >
              {_t("login.login-info-2")}
            </a>
          </p>
          <Button
            disabled={inProgress || username.length < 3 || username.length > 16}
            block={true}
            onClick={this.login}
          >
            {inProgress && username && key && spinner}
            {_t("g.login")}
          </Button>
        </Form>
        <OrDivider />
        <div className="hs-login">
          <a
            className={_c(`btn btn-outline-primary ${inProgress ? "disabled" : ""}`)}
            onClick={this.hsLogin}
          >
            <img
              src={global.isElectron ? "./img/hive-signer.svg" : hsLogo}
              className="hs-logo"
              alt="hivesigner"
            />{" "}
            {_t("login.with-hive-signer")}
          </a>
        </div>
        {global.hasKeyChain && (
          <div className="kc-login">
            <a
              className={_c(`btn btn-outline-primary ${inProgress ? "disabled" : ""}`)}
              onClick={this.kcLogin}
            >
              <img src={keyChainLogo} className="kc-logo" alt="keychain" />{" "}
              {_t("login.with-keychain")}
            </a>
          </div>
        )}
        {activeUser === null && (
          <p>
            {_t("login.sign-up-text-1")}
            &nbsp;
            <a
              href="#"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                this.hide();

                const { history } = this.props;
                history.push("/signup");
              }}
            >
              {_t("login.sign-up-text-2")}
            </a>
          </p>
        )}
      </>
    );
  }
}

interface Props {
  history: History;
  location: Location;
  global: Global;
  ui: UI;
  users: User[];
  activeUser: ActiveUser | null;
  addUser: (user: User) => void;
  setActiveUser: (username: string | null) => void;
  updateActiveUser: (data?: Account) => void;
  deleteUser: (username: string) => void;
  toggleUIProp: (what: ToggleType) => void;
}

export default class LoginDialog extends Component<Props> {
  userListRef = React.createRef();

  hide = () => {
    const { toggleUIProp } = this.props;
    toggleUIProp("login");
  };

  componentWillUnmount() {
    const { toggleUIProp, ui } = this.props;
  }

  doLogin = async (hsCode: string, postingKey: null | undefined | string, account: Account) => {
    const { global, setActiveUser, updateActiveUser, addUser } = this.props;

    // get access token from code
    return hsTokenRenew(hsCode).then((x) => {
      const user: User = {
        username: x.username,
        accessToken: x.access_token,
        refreshToken: x.refresh_token,
        expiresIn: x.expires_in,
        postingKey
      };

      // add / update user data
      addUser(user);

      // activate user
      setActiveUser(user.username);

      // add account data of the user to the reducer
      updateActiveUser(account);

      if (global.usePrivate) {
        // login activity
        usrActivity(user.username, 20);
      }

      if (user.username) {
        logUser(user.username, global);
      }

      // redirection based on path name
      const { location, history } = this.props;
      if (location.pathname.startsWith("/signup")) {
        const u = `/@${x.username}/feed`;
        history.push(u);
      }
    });
  };

  render() {
    const { ui, users } = this.props;

    return (
      <Modal
        show={true}
        centered={true}
        onHide={this.hide}
        className="login-modal modal-thin-header"
        animation={false}
      >
        <Modal.Header closeButton={true} />
        <Modal.Body>
          {!ui.loginKc && (
            <Login {...this.props} doLogin={this.doLogin} userListRef={this.userListRef} />
          )}
          {ui.loginKc && (
            <LoginKc {...this.props} userListRef={this.userListRef} doLogin={this.doLogin} />
          )}
        </Modal.Body>
      </Modal>
    );
  }
}
