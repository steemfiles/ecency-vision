import React from "react";

import EntryVoteBtn, { VoteDialog } from "./index";

import renderer from "react-test-renderer";

import {
  globalInstance,
  dynamicPropsIntance1,
  entryInstance1,
  UiInstance,
  activeUserMaker,
  fullAccountInstance,
} from "../../helper/test-helper";

import { Account } from "../../store/accounts/types";
import { historicalPOBConfig, historicalPOBInfo } from "../../api/hive-engine";

jest.mock("../../api/hive", () => ({
  votingPower: () => 5,
  getActiveVotes: () =>
    new Promise((resolve) => {
      resolve([{ voter: "user1", percent: 10 }]);
    }),
}));

describe("(1) Dialog", () => {
  const data: Account = {
    ...fullAccountInstance,
    name: "user1",
    vesting_shares: "0.000000 VESTS",
    delegated_vesting_shares: "0.000000 VESTS",
    received_vesting_shares: "77883823.534631 VESTS",
  };

  const props = {
    activeUser: { ...activeUserMaker("user1"), ...{ data } },
    prices: {},
    dynamicProps: dynamicPropsIntance1,
    global: globalInstance,
    entry: entryInstance1,
    downVoted: false,
    upVoted: false,
    onClick: () => {},
  };

  const component = renderer.create(
    <VoteDialog
      {...props}
      tokenConfig={historicalPOBConfig}
      tokenInfo={historicalPOBInfo}
      tokenPriceInHive={10}
    />
  );
  const instance: any = component.getInstance();

  it("(1) Up vote", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(2) Down vote", () => {
    instance.changeMode("down");
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(2) Btn - No active user", () => {
  const props = {
    global: globalInstance,
    dynamicProps: dynamicPropsIntance1,
    entry: entryInstance1,
    users: [],
    activeUser: null,
    ui: UiInstance,
    setActiveUser: () => {},
    updateActiveUser: () => {},
    deleteUser: () => {},
    afterVote: () => {},
    toggleUIProp: () => {},
    prices: {},
    hiveEngineTokensProperties: {},
  };

  const component = renderer.create(<EntryVoteBtn {...props} />);

  it("(1) Render", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(3) Btn - Up voted", () => {
  const props = {
    global: globalInstance,
    dynamicProps: dynamicPropsIntance1,
    entry: entryInstance1,
    users: [
      {
        username: "user1",
        accessToken: "s",
        refreshToken: "b",
        expiresIn: 1,
        postingKey: null,
      },
    ],
    activeUser: activeUserMaker("user1"),
    ui: UiInstance,
    setActiveUser: () => {},
    updateActiveUser: () => {},
    deleteUser: () => {},
    afterVote: () => {},
    toggleUIProp: () => {},
    prices: {
      POB: 3,
    },
    hiveEngineTokensProperties: {
      POB: {
        info: historicalPOBInfo,
        config: historicalPOBConfig,
        hivePrice: 3,
      },
    },
  };

  const component = renderer.create(<EntryVoteBtn {...props} />);
  const instance: any = component.getInstance();

  it("(1) Render", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });
});
