import reducer, {initialState } from "./index";
let state = {};

it("1- default state", () => {
    expect(state).toMatchSnapshot();
});
