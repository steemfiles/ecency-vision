import React, { Component } from "react";
import { LIQUID_TOKEN_UPPERCASE, VESTING_TOKEN } from "../../../client_config";
import { History } from "history";
import { Modal } from "react-bootstrap";
import { Global } from "../../store/global/types";
import { Account } from "../../store/accounts/types";
import { DynamicProps } from "../../store/dynamic-props/types";
import { ActiveUser } from "../../store/active-user/types";
import BaseComponent from "../base";
import ProfileLink from "../profile-link";
import UserAvatar from "../user-avatar";
import LinearProgress from "../linear-progress";
import Tooltip from "../tooltip";
import KeyOrHotDialog from "../key-or-hot-dialog";
import { error } from "../feedback";
import { DelegatedVestingShare, getVestingDelegations } from "../../api/hive";
import {
  undelegateVestingShares,
  undelegateVestingSharesHot,
  undelegateVestingSharesKc,
  formatError,
} from "../../api/operations";
import { _t } from "../../i18n";
import { vestsToHp } from "../../helper/vesting";
import parseAsset from "../../helper/parse-asset";
import formattedNumber from "../../util/formatted-number";
import _c from "../../util/fix-class-names";

interface HEDelegation {
  created: number; // of ms since 1970
  from: string; // username
  quantity: string; // "100.00000000"
  symbol: string;
  to: string;
  updated: number;
}

interface Props {
  history: History;
  global: Global;
  activeUser: ActiveUser | null;
  account: Account;
  dynamicProps: DynamicProps;
  signingKey: string;
  addAccount: (data: Account) => void;
  setSigningKey: (key: string) => void;
  onHide: () => void;
  updateActiveUser: (data?: Account) => void;
}

interface State {
  loading: boolean;
  inProgress: boolean;
  data: HEDelegation[];
  hideList: boolean;
}

export class ListHE extends BaseComponent<Props, State> {
  state: State = {
    loading: false,
    inProgress: false,
    data: [],
    hideList: false,
  };
  componentDidMount() {
    const { account } = this.props;
    try {
      const token_delegations: HEDelegation[] | undefined =
        account["token_delegations"];
      const { name } = account;
      if (!token_delegations) {
        this.fetch().then();
        return;
      }
      const delegated: HEDelegation[] = token_delegations.filter(
        (d) => d.from == name && d.symbol == LIQUID_TOKEN_UPPERCASE
      );

      this.stateSet({ data: delegated });
    } catch {}
  }
  fetch = () => {
    return new Promise<void>(function (
      myResolve: () => void,
      myReject: () => void
    ) {
      myResolve(); // when successful
    });
  };
  render() {
    const { loading, hideList, inProgress, data } = this.state;
    const { dynamicProps, activeUser, account, updateActiveUser } = this.props;
    const { hivePerMVests } = dynamicProps;

    if (loading) {
      return (
        <div className="delegated-vesting-content">
          <LinearProgress />
        </div>
      );
    }
    return (
      <div
        className={_c(
          `delegated-vesting-content ${inProgress ? "in-progress" : ""} ${
            hideList ? "hidden" : ""
          }`
        )}
      >
        <div className="user-list">
          <div className="list-body">
            {data.length === 0 && (
              <div className="empty-list">{_t("g.empty-list")}</div>
            )}
            {data.map((x) => {
              const { symbol, quantity, to: username } = x;
              const deleteBtn =
                activeUser && activeUser.username === account.name
                  ? KeyOrHotDialog({
                      ...this.props,
                      activeUser: activeUser,
                      children: (
                        <a href="#" className="undelegate">
                          {_t("delegated-vesting.undelegate")}
                        </a>
                      ),
                      onToggle: () => {
                        const { hideList } = this.state;
                        this.stateSet({ hideList: !hideList });
                      },
                      onKey: (key) => {
                        this.stateSet({ inProgress: true });
                        undelegateVestingShares(
                          activeUser.username,
                          key,
                          username,
                          quantity,
                          symbol
                        )
                          .then((TxC) => {
                            this.stateSet({
                              data: data.filter((y) => y.to != x.to),
                            });
                            updateActiveUser(activeUser.data);
                          })
                          .catch((err) => error(formatError(err)))
                          .finally(() => {
                            this.setState({ inProgress: false });
                          });
                      },
                      onHot: () => {
                        error(
                          "Cannot use Hive Signer to Undelegate Hive Engine tokens.  Use Hive Keychain"
                        );
                      },
                      onKc: () => {
                        this.stateSet({ inProgress: true });
                        undelegateVestingSharesKc(
                          activeUser.username,
                          username,
                          quantity,
                          symbol
                        )
                          .then(() => {
                            this.stateSet({
                              data: data.filter((y) => y.to !== x.to),
                            });
                            updateActiveUser(activeUser.data);
                          })
                          .catch((err) => error(formatError(err)))
                          .finally(() => {
                            this.stateSet({ inProgress: false });
                          });
                      },
                    })
                  : null;
              return (
                <div className="list-item" key={username}>
                  <div className="item-main">
                    {ProfileLink({
                      ...this.props,
                      username,
                      children: (
                        <>
                          {UserAvatar({
                            ...this.props,
                            username: x.to,
                            size: "small",
                          })}
                        </>
                      ),
                    })}
                    <div className="item-info">
                      {ProfileLink({
                        ...this.props,
                        username,
                        children: (
                          <a className="item-name notransalte">{username}</a>
                        ),
                      })}
                    </div>
                  </div>
                  <div className="item-extra">
                    <Tooltip content={x.quantity}>
                      <span>
                        {formattedNumber(x.quantity, { suffix: x.symbol })}
                      </span>
                    </Tooltip>
                    {deleteBtn}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
}

export default class DelegatedVestingHE extends Component<Props> {
  render() {
    const { onHide } = this.props;
    return (
      <>
        <Modal onHide={onHide} show={true} centered={true} animation={false}>
          <Modal.Header closeButton={true}>
            <Modal.Title>{VESTING_TOKEN}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ListHE {...this.props} />
          </Modal.Body>
        </Modal>
      </>
    );
  }
}
