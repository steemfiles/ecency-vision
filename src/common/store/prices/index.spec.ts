import reducer, {initialState } from "./index";
import {PriceHash} from "./types";

let state: PriceHash = {};

it("1- default state", () => {
    expect(state).toMatchSnapshot();
});
