import React, {Component} from "react";

import {Form, FormControl, Modal, Button} from "react-bootstrap";

import {Global} from "../../store/global/types";
import {DynamicProps} from "../../store/dynamic-props/types";
import {ActiveUser} from "../../store/active-user/types";
import {Transactions} from "../../store/transactions/types";
import {Account} from "../../store/accounts/types";

import BaseComponent from "../base";
import {Transfer, TransferAsset} from "../transfer";

import {calcPoints} from "../../api/private-api";

import {_t} from "../../i18n";

import _c from "../../util/fix-class-names";
import formattedNumber from "../../util/formatted-number";
import {DOLLAR_API_NAME, HIVE_API_NAME} from "../../api/hive";

interface Props {
    global: Global;
    dynamicProps: DynamicProps;
    activeUser: ActiveUser;
    transactions: Transactions;
    signingKey: string;
    addAccount: (data: Account) => void;
    updateActiveUser: (data?: Account) => void;
    setSigningKey: (key: string) => void;
    onHide: () => void;
}

interface State {
    submitted: boolean,
    asset: TransferAsset,
    amount: number,
    points: number,
    usd: number
}


export class Purchase extends BaseComponent<Props, State> {
    state: State = {
        submitted: false,
        asset: HIVE_API_NAME,
        amount: 250,
        points: 0,
        usd: 0
    }

    _timer: any = null;

    componentDidMount() {
        this.calc();
    }

    setAsset = (asset: TransferAsset) => {
        this.stateSet({asset}, () => {
            this.calc();
        });
    }

    sliderChanged = (e: React.ChangeEvent<typeof FormControl & HTMLInputElement>) => {
        const amount = Number(e.target.value);
        this.stateSet({amount});

        clearTimeout(this._timer);
        this._timer = setTimeout(() => this.calc(), 500);
    }

    calc = () => {
        const {activeUser} = this.props;
        const {asset, amount} = this.state;
        const sAmount = `${amount}.000 ${asset}`;

        calcPoints(activeUser.username, sAmount).then(resp => {
            this.stateSet({usd: resp.usd, points: resp.estm});
        });
    };

    submit = () => {
        this.stateSet({submitted: true});
    }

    render() {
        const {asset, amount, points, usd, submitted} = this.state;

        if (submitted) {
            return <Transfer {...this.props} asset={asset} mode="transfer" amount={`${amount}.000`} to="esteem.app" memo="estm-purchase"/>
        }

        return <div className="purchase-dialog-content">
            <div className="curr-select">
                <div className="curr-label">{_t('purchase.select-asset')}</div>
                <div className="nav nav-pills">
                    <div className="nav-item">
                        <a href="#" onClick={e => {
                            e.preventDefault();
                            this.setAsset(HIVE_API_NAME)
                        }} className={_c(`nav-link ${asset === HIVE_API_NAME ? 'active' : ''}`)}>HIVE</a>
                    </div>
                    <div className="nav-item">
                        <a href="#" onClick={e => {
                            e.preventDefault();
                            this.setAsset(DOLLAR_API_NAME)
                        }} className={_c(`nav-link ${asset === DOLLAR_API_NAME ? 'active' : ''}`)}>HBD</a>
                    </div>
                </div>
            </div>
            <div className="input-amounts">
                <div className="asset-amount">
                    {`${formattedNumber(amount, {fractionDigits: 3})} ${asset}`}
                </div>

                <div className="usd-amount">
                    {formattedNumber(usd, {fractionDigits: 3})} {'$'}
                </div>
            </div>
            <div className="slider-area">
                <Form.Control
                    type="range"
                    autoFocus={true}
                    custom={true}
                    step={1}
                    min={1}
                    max={10000}
                    value={amount}
                    onChange={this.sliderChanged}
                />
                <Form.Text className="text-muted">{_t('purchase.slider-hint')}</Form.Text>
            </div>
            <div className="point-amount">
                {formattedNumber(points, {fractionDigits: 3})} {'POINTS'}
            </div>
            <div className="text-center">
                <Button onClick={this.submit}>{_t('purchase.submit')}</Button>
            </div>
        </div>
    }
}

export default class PurchaseDialog extends Component<Props> {
    render() {
        const {onHide} = this.props;
        return (
            <Modal animation={false} show={true} centered={true} onHide={onHide} keyboard={false} className="purchase-dialog modal-thin-header" size="lg">
                <Modal.Header closeButton={true}/>
                <Modal.Body>
                    <Purchase {...this.props} />
                </Modal.Body>
            </Modal>
        );
    }
}
