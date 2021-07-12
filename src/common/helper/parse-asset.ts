export type Symbol = string;

export interface Asset {
    amount: number,
    symbol: Symbol
}

export default (strVal: string): Asset => {

    const sp = strVal.split(' ');
    return {
        amount: parseFloat(sp[0]),
        symbol: sp[1],
    }
}
