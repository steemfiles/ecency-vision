import {Account} from "../store/accounts/types";
import {DynamicProps} from "../store/dynamic-props/types";
import HiveWallet from "./hive-wallet";
import {FullHiveEngineAccount, TokenBalance} from "../api/hive-engine";

export default class HiveEngineWallet extends HiveWallet {

    public engineBalanceTable: { [symbol: string]: TokenBalance } = {};
    public engineBalanceArray: Array<TokenBalance> = [];
    public token_unstakes: any = [];
    public token_statuses: any = [];
    public transfer_history: any = [];
    public token_delegations: Array<any> = [];
    public prices : {[id:string]: number} = {};
    public estimatedValue : number = 0;


    constructor(account: Account, dynamicProps: DynamicProps, convertingHBD: number = 0, shortCoinName: string) {
        super(account, dynamicProps, convertingHBD);
        const {hivePerMVests, base, quote} = dynamicProps;
        const pricePerHive = base / quote;
        
        if (!account.__loaded) {
            return;
        }

        {
            const faccount : FullHiveEngineAccount = account as FullHiveEngineAccount;
            if (!faccount.token_balances) {
                return;
            }
            for (const tb of faccount.token_balances) {
                this.engineBalanceTable[tb.symbol] = tb;
            }
            this.engineBalanceArray = faccount.token_balances;
            this.prices = faccount.prices;
            this.token_unstakes = faccount.token_unstakes;
            this.token_statuses = faccount.token_statuses;
            this.transfer_history = faccount.transfer_history;
            this.token_delegations = faccount.token_delegations;
            
            this.estimatedValue = 0;
            const balance = faccount.token_balances.find(B => B.symbol === shortCoinName);
            let p : number | undefined;
            if (balance && (p = faccount.prices[balance.symbol])) {
                const liquid : number = (balance.balance);
                const stake  : number = (balance.stake);
                // delegationsIn is not part of stake, so there is no need to subtract
                //const delegationsIn = parseFloat(balance.delegationsIn);

                // stake doesn't include delegationsOut.  This must be added to the total.
                // pending* attributes are about the future we don't need to add or subtract those for this.
                const delegationsOut : number = balance.delegationsOut;
                this.estimatedValue = (liquid+stake+delegationsOut) * p * pricePerHive;
            }
        }
    }
}
