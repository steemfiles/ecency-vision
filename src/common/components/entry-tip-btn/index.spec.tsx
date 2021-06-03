import React from "react";

import EntryTipBtn, {TippingDialog} from "./index";

import {globalInstance, dynamicPropsIntance1, UiInstance, entryInstance1, fullAccountInstance} from "../../helper/test-helper";

import TestRenderer from "react-test-renderer";

const defProps = {
    global: globalInstance,
    dynamicProps: dynamicPropsIntance1,
    users: [],
    ui: UiInstance,
    activeUser: {
        username: 'foo',
        data: {
            ...fullAccountInstance,
        },
        points: {
            points: "200.000",
            uPoints: "0.000"
        },
        hiveEngineBalances: [],
    },
    entry: entryInstance1,
    signingKey: "",
    addAccount: () => {
    },
    setActiveUser: () => {
    },
    updateActiveUser: () => {
    },
    deleteUser: () => {
    },
    toggleUIProp: () => {
    },
    setSigningKey: () => {
    }
};

it("(1) Default render", async () => {
    const renderer = TestRenderer.create(<EntryTipBtn {...defProps} />);

    expect(renderer.toJSON()).toMatchSnapshot();
});

it("(2) Dialog", async () => {
    const props = {
        ...defProps,
        onHide: () => {
        }
    }

    const renderer = TestRenderer.create(<TippingDialog {...props} />);
    expect(renderer.toJSON()).toMatchSnapshot();
});
