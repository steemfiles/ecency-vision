import React, { Component } from "react";

import isEqual from "react-fast-compare";

import { Form, FormControl, Modal, Button, Col, Row } from "react-bootstrap";

import { PrivateKey } from "@hiveio/dhive";

import { Global } from "../../store/global/types";
import { Account } from "../../store/accounts/types";
import { ActiveUser } from "../../store/active-user/types";
import { Entry } from "../../store/entries/types";

import BaseComponent from "../base";
import LinearProgress from "../linear-progress";
import SuggestionList from "../suggestion-list";
import KeyOrHot from "../key-or-hot";
import { error } from "../feedback";
import formattedNumber from "../../util/formatted-number";
import {
  getPromotePrice,
  PromotePrice,
  getPromotedPost,
} from "../../api/private-api";
import { searchPath } from "../../api/search-api";
import { getPost } from "../../api/bridge";
import {
  promote,
  promoteHot,
  promoteKc,
  formatError,
} from "../../api/operations";

import { _t } from "../../i18n";

import _c from "../../util/fix-class-names";

import { checkAllSvg } from "../../img/svg";
import axios from "axios";
import { LIQUID_TOKEN as HE_LIQUID_TOKEN } from "../../../client_config";
import { FullHiveEngineAccount, TokenBalance, is_not_FullHiveEngineAccount } from "../../api/hive-engine";

interface Props {
  global: Global;
  activeUser: ActiveUser;
  signingKey: string;
  entry?: Entry;
  updateActiveUser: (data?: Account) => void;
  setSigningKey: (key: string) => void;
  onHide: () => void;
}

interface State {
  balanceError: string;
  path: string;
  postError: string;
  paths: string[];
  price_rate: null | number;
  duration: number;
  inProgress: boolean;
  step: 1 | 2 | 3;
}

const pathComponents = (p: string): string[] => p.replace("@", "").split("/");
const getHEBalance = (a : ActiveUser) : number => {
        let d : FullHiveEngineAccount; 
        let tba : Array<TokenBalance>;
        
        if (is_not_FullHiveEngineAccount(a.data)) {
          return 0;
        }
        d = a.data as FullHiveEngineAccount;
        tba = d.token_balances;
        if (tba === undefined) {
          return 0;
        } else {
          const tb : TokenBalance | undefined = tba.find((y : TokenBalance) => y.symbol === 'POB');
          if (tb) {
            return tb.balance;
          } else {
            return 0;
          }
        }
  };
  
const crasis_expensive = 1;
export class Promote extends BaseComponent<Props, State> {
  state: State = {
    balanceError: "",
    path: "",
    paths: [],
    postError: "",
    price_rate: crasis_expensive,
    duration: 1,
    inProgress: true,
    step: 1,
  };
  

  

  _timer: any = null;

  componentDidMount() {
    this.init()
      .then(() => {
        const { updateActiveUser } = this.props;
        updateActiveUser();
      })
      .then(() => {
        const { entry } = this.props;
        const {price_rate} = this.state;
        if (entry) {
          this.stateSet({ path: `${entry.author}/${entry.permlink}`, inProgress: price_rate == crasis_expensive });
        }
      });
  }

  componentDidUpdate(prevProps: Readonly<Props>) {
    if (!isEqual(getHEBalance(this.props.activeUser), getHEBalance(prevProps.activeUser))) {
      this.checkBalance();
    }
  }

  init = () => {
    const { activeUser } = this.props;
    return axios({
      url:'/promotion-api/getprice',
      method: 'GET',
    })
    .then((response) => {
        const {data, statusText} = response;
        if (statusText === "OK") {
          const {price_rate} = data;
          console.log("Setting price_rate to " + price_rate);
          this.stateSet({ price_rate, inProgress: false });
        }
    })
    .catch(() => {
      error(_t("g.server-error"));
    });
  };

  durationChanged = (
    e: React.ChangeEvent<typeof FormControl & HTMLInputElement>
  ) => {
    const duration = Number(e.target.value);
    this.stateSet({ duration }, () => {
      this.checkBalance();
    });
  };

  pathChanged = (
    e: React.ChangeEvent<typeof FormControl & HTMLInputElement>
  ) => {
    const path = e.target.value;
    this.stateSet({ path, postError: "" });

    clearTimeout(this._timer);

    if (path.trim().length < 3) {
      this.stateSet({ paths: [] });
      return;
    }

    const { activeUser } = this.props;

    this._timer = setTimeout(
      () =>
        searchPath(activeUser.username, path).then((resp) => {
          this.stateSet({ paths: resp });
        }),
      500
    );
  };

  pathSelected = (path: string) => {
    this.stateSet({ path: path, paths: [] });
  };

  checkBalance = () => {
    const { activeUser } = this.props;
    const { duration, price_rate } = this.state;

    const price = price_rate * 3600/2;

    const balanceError =
      getHEBalance(activeUser) < price
        ? _t("trx-common.insufficient-funds")
        : "";

    this.stateSet({ balanceError });
  };

  isValidPath = (p: string) => {
    if (p.indexOf("/") === -1) {
      return;
    }

    const [author, permlink] = pathComponents(p);
    return author.length >= 3 && permlink.length >= 3;
  };

  next = async () => {
    const { activeUser } = this.props;
    const { path } = this.state;

    const [author, permlink] = pathComponents(path);

    this.stateSet({ inProgress: true });

    // Check if post is valid
    let post: Entry | null;
    try {
      post = await getPost(author, permlink);
    } catch (e) {
      post = null;
    }

    if (!post) {
      this.stateSet({
        postError: _t("redeem-common.post-error"),
        inProgress: false,
      });
      return;
    }

    // Check if the post already promoted
    const promoted = await axios({
      url: '/promotion-api/getPromotions',
      method: 'GET'
    });
    if (promoted) {
      this.stateSet({
        postError: _t("redeem-common.post-error-exists"),
        inProgress: false,
      });
      return;
    }

    this.stateSet({ inProgress: false, step: 2 });
  };

  sign = (key: PrivateKey) => {
    const { activeUser } = this.props;
    const { path, duration } = this.state;
    const [author, permlink] = pathComponents(path);

    this.setState({ inProgress: true });
    promote(key, activeUser.username, author, permlink, duration)
      .then(() => {
        this.stateSet({ step: 3 });
      })
      .catch((err) => {
        error(formatError(err));
      })
      .finally(() => {
        this.setState({ inProgress: false });
      });
  };

  signKc = () => {
    const { activeUser } = this.props;
    const { path, duration } = this.state;
    const [author, permlink] = pathComponents(path);

    this.setState({ inProgress: true });
    promoteKc(activeUser.username, author, permlink, duration)
      .then(() => {
        this.stateSet({ step: 3 });
      })
      .catch((err) => {
        error(formatError(err));
      })
      .finally(() => {
        this.setState({ inProgress: false });
      });
  };

  hotSign = () => {
    const { activeUser, onHide } = this.props;
    const { path, duration } = this.state;
    const [author, permlink] = pathComponents(path);

    promoteHot(activeUser.username, author, permlink, duration);
    onHide();
  };

  finish = () => {
    const { onHide } = this.props;
    onHide();
  };

  render() {
    const { activeUser } = this.props;
    const {
      price_rate,
      balanceError,
      path,
      paths,
      postError,
      duration,
      inProgress,
      step,
    } = this.state;

    const canSubmit = !postError && !balanceError && this.isValidPath(path);

    const HE_token_balance = (() => {
        try {
          return formattedNumber(getHEBalance(activeUser), 
      {suffix: HE_LIQUID_TOKEN, fractionDigits: 8});
        } catch (e) {
          console.log(e);
          return "0 POB";
        }
    })();

    return (
      <div className="promote-dialog-content">
        {step === 1 && (
          <div
            className={`transaction-form ${inProgress ? "in-progress" : ""}`}
          >
            <div className="transaction-form-header">
              <div className="step-no">1</div>
              <div className="box-titles">
                <div className="main-title">{_t("promote.title")}</div>
                <div className="sub-title">{_t("promote.sub-title")}</div>
              </div>
            </div>
            {inProgress && <LinearProgress />}
            <div className="transaction-form-body">
              <Form.Group as={Row}>
                <Form.Label column={true} sm="2">
                  {_t("redeem-common.balance")}
                </Form.Label>
                <Col sm="10">
                  <Form.Control
                    className={_c(
                      `balance-input ${balanceError ? "is-invalid" : ""}`
                    )}
                    plaintext={true}
                    readOnly={true}
                    value={HE_token_balance}
                  />
                  {balanceError && (
                    <Form.Text className="text-danger">
                      {balanceError}
                    </Form.Text>
                  )}
                </Col>
              </Form.Group>
              <Form.Group as={Row}>
                <Form.Label column={true} sm="2">
                  {_t("redeem-common.post")}
                </Form.Label>
                <Col sm="10">
                  <SuggestionList
                    items={paths}
                    renderer={(i) => i}
                    onSelect={this.pathSelected}
                  >
                    <Form.Control
                      className={postError ? "is-invalid" : ""}
                      type="text"
                      value={path}
                      onChange={this.pathChanged}
                      placeholder={_t("redeem-common.post-placeholder")}
                      disabled={inProgress}
                    />
                  </SuggestionList>
                  {postError && (
                    <Form.Text className="text-danger">{postError}</Form.Text>
                  )}
                  {!postError && (
                    <Form.Text className="text-muted">
                      {_t("redeem-common.post-hint")}
                    </Form.Text>
                  )}
                </Col>
              </Form.Group>
              <Form.Group as={Row}>
                <Form.Label column={true} sm="2">
                  {_t("promote.duration")}
                </Form.Label>
                <Col sm="10">
                  <Form.Control
                    as="select"
                    value={duration}
                    onChange={this.durationChanged}
                    disabled={inProgress}
                  >
                  {[{duration: 1800, duration_name: "30 minutes"},
                      {duration: 3600, duration_name: "1 hour"},
                      {duration: 7200, duration_name: "2 hour"},
                      {duration: 18000, duration_name: "5 hours"},
                      {duration: 36000, duration_name: "10 hours"},
                      {duration: 86400, duration_name: "1 day"},
                      {duration: 2*86400, duration_name: "2 days"},
                      {duration: 5*86400, duration_name: "5 days"},
                      {duration: 7*86400, duration_name: "1 week"},
                      {duration: 14*86400, duration_name: "2 weeks"},
                  ].map( d => {
                      const {duration, duration_name} = d;
                      const cost = price_rate * duration;
                      return <option key={duration} value={duration}>
                       {duration_name}  {formattedNumber(cost, {maximumFractionDigits:8, fractionDigits:0, suffix:'POB'})}
                      </option>;
                  } 
                      )
                  }
                      
                  </Form.Control>
                </Col>
              </Form.Group>
              <Form.Group as={Row}>
                <Form.Label column={true} sm="2" />
                <Col sm="10">
                  <Button
                    type="button"
                    onClick={this.next}
                    disabled={!canSubmit || inProgress}
                    variant="primary"
                  >
                    {_t("g.next")}
                  </Button>
                </Col>
              </Form.Group>
            </div>
          </div>
        )}

        {step === 2 && (
          <div
            className={`transaction-form ${inProgress ? "in-progress" : ""}`}
          >
            <div className="transaction-form-header">
              <div className="step-no">2</div>
              <div className="box-titles">
                <div className="main-title">{_t("trx-common.sign-title")}</div>
                <div className="sub-title">
                  {_t("trx-common.sign-sub-title")}
                </div>
              </div>
            </div>
            {inProgress && <LinearProgress />}
            <div className="transaction-form-body">
              {KeyOrHot({
                ...this.props,
                inProgress,
                onKey: this.sign,
                onHot: this.hotSign,
                onKc: this.signKc,
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div
            className={`transaction-form ${inProgress ? "in-progress" : ""}`}
          >
            <div className="transaction-form-header">
              <div className="step-no">3</div>
              <div className="box-titles">
                <div className="main-title">
                  {_t("trx-common.success-title")}
                </div>
                <div className="sub-title">
                  {_t("trx-common.success-sub-title")}
                </div>
              </div>
            </div>
            {inProgress && <LinearProgress />}
            <div className="transaction-form-body">
              <p className="d-flex justify-content-center align-content-center">
                <span className="svg-icon text-success">{checkAllSvg}</span>{" "}
                {_t("redeem-common.success-message")}
              </p>
              <div className="d-flex justify-content-center">
                <Button onClick={this.finish}>{_t("g.finish")}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default class PromoteDialog extends Component<Props> {
  render() {
    const { onHide } = this.props;
    return (
      <Modal
        animation={false}
        show={true}
        centered={true}
        onHide={onHide}
        keyboard={false}
        className="promote-dialog modal-thin-header"
        size="lg"
      >
        <Modal.Header closeButton={true} />
        <Modal.Body>
          <Promote {...this.props} />
        </Modal.Body>
      </Modal>
    );
  }
}
