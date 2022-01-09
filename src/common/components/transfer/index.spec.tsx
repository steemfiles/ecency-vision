import React from "react";

import { Transfer, TransferAsset, TransferMode } from "./index";

import { initialState as transactionsInitialState } from "../../store/transactions/index";

import {
  globalInstance,
  dynamicPropsIntance1,
  fullAccountInstance,
} from "../../helper/test-helper";

import { historicalPOBConfig, historicalPOBInfo } from "../../api/hive-engine";

import TestRenderer from "react-test-renderer";

jest.mock("moment", () => () => ({
  fromNow: () => "in 5 days",
}));

const defProps = {
  global: globalInstance,
  dynamicProps: dynamicPropsIntance1,
  users: [],
  activeUser: {
    username: "foo",
    data: {
      ...fullAccountInstance,
      name: "foo",
    },
    points: {
      points: "10.000",
      uPoints: "0.000",
    },
    hiveEngineBalances: [],
  },
  hiveEngineTokensEnabled: [],
  transactions: transactionsInitialState,
  signingKey: "",
  addAccount: () => {},
  updateActiveUser: () => {},
  setSigningKey: () => {},
  onHide: () => {},
};

describe("(1) Transfer HIVE", () => {
  const mode: TransferMode = "transfer";
  const asset: TransferAsset = "HIVE";

  const props = {
    ...defProps,
    mode,
    asset,
  };

  const component = TestRenderer.create(<Transfer {...props} />);
  const instance: any = component.getInstance();

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(2) Step 2", () => {
    instance.setState({ step: 2, to: "bar" });
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(3) Step 3", () => {
    instance.setState({ step: 3 });
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(4) Step 4", () => {
    instance.setState({ step: 4 });
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(2) Transfer HBD", () => {
  const mode: TransferMode = "transfer";
  const asset: TransferAsset = "HBD";

  const props = {
    ...defProps,
    mode,
    asset,
  };

  const component = TestRenderer.create(<Transfer {...props} />);
  const instance: any = component.getInstance();

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(2) Step 2", () => {
    instance.setState({ step: 2, to: "bar", memo: "hdb transfer" });
    expect(component.toJSON()).toMatchSnapshot();
  });

  // No need to test step3 anymore

  it("(4) Step 4", () => {
    instance.setState({ step: 4 });
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(3) Transfer POINT", () => {
  const mode: TransferMode = "transfer";
  const asset: TransferAsset = "POINT";

  const props = {
    ...defProps,
    mode,
    asset,
  };

  const component = TestRenderer.create(<Transfer {...props} />);
  const instance: any = component.getInstance();

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(2) Step 2", () => {
    instance.setState({ step: 2, to: "bar" });
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(4) Step 4", () => {
    instance.setState({ step: 4 });
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(4) Transfer to Savings - HBD", () => {
  const mode: TransferMode = "transfer-saving";
  const asset: TransferAsset = "HBD";

  const props = {
    ...defProps,
    mode,
    asset,
  };

  const component = TestRenderer.create(<Transfer {...props} />);
  const instance: any = component.getInstance();

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(2) Step 2", () => {
    instance.setState({ step: 2, to: "bar" });
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(4) Step 4", () => {
    instance.setState({ step: 4 });
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(5) Withdraw Savings - HIVE", () => {
  const mode: TransferMode = "withdraw-saving";
  const asset: TransferAsset = "HIVE";

  const props = {
    ...defProps,
    mode,
    asset,
  };

  const component = TestRenderer.create(<Transfer {...props} />);
  const instance: any = component.getInstance();

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(2) Step 2", () => {
    instance.setState({ step: 2, to: "bar" });
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(4) Step 4", () => {
    instance.setState({ step: 4 });
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(6) Convert", () => {
  const mode: TransferMode = "convert";
  const asset: TransferAsset = "HBD";

  const props = {
    ...defProps,
    mode,
    asset,
  };

  const component = TestRenderer.create(<Transfer {...props} />);
  const instance: any = component.getInstance();

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(2) Step 2", () => {
    instance.setState({ step: 2, to: "bar" });
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(4) Step 4", () => {
    instance.setState({ step: 4 });
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(7) Power up", () => {
  const mode: TransferMode = "power-up";
  const asset: TransferAsset = "HIVE";

  const props = {
    ...defProps,
    mode,
    asset,
  };

  const component = TestRenderer.create(<Transfer {...props} />);
  const instance: any = component.getInstance();

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(2) Step 2", () => {
    instance.setState({ step: 2, to: "bar" });
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(4) Step 4", () => {
    instance.setState({ step: 4 });
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(8) Delegate", () => {
  const mode: TransferMode = "delegate";
  const asset: TransferAsset = "HP";

  const props = {
    ...defProps,
    mode,
    asset,
  };

  const component = TestRenderer.create(<Transfer {...props} />);
  const instance: any = component.getInstance();

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(2) Step 2", () => {
    instance.setState({ step: 2, to: "bar" });
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(4) Step 4", () => {
    instance.setState({ step: 4 });
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(9) Power down", () => {
  const mode: TransferMode = "power-down";
  const asset: TransferAsset = "HP";

  const props = {
    ...defProps,
    mode,
    asset,
  };

  const component = TestRenderer.create(<Transfer {...props} />);
  const instance: any = component.getInstance();
  instance.setState({ amount: "2.000" });

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(2) Step 2", () => {
    instance.setState({ step: 2, to: "bar" });
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(4) Step 4", () => {
    instance.setState({ step: 4 });
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(10) Powering down", () => {
  const mode: TransferMode = "power-down";
  const asset: TransferAsset = "HP";

  const props = {
    ...defProps,
    mode,
    asset,
    activeUser: {
      username: "foo",
      data: {
        ...fullAccountInstance,
        next_vesting_withdrawal: "2020-12-21T09:34:54",
        vesting_withdraw_rate: "525426.335537 VESTS",
        to_withdraw: "6830542361972",
        withdrawn: "6305116026444",
        name: "foo",
      },
      points: {
        points: "10.000",
        uPoints: "0.000",
      },
      hiveEngineBalances: [],
    },
  };

  const component = TestRenderer.create(<Transfer {...props} />);

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });
});

const HEPOBProps = {
  ...defProps,
  activeUser: {
    username: "foo",
    data: {
      ...fullAccountInstance,
      name: "foo",
      token_balances: [
        {
          _id: 184965,
          account: "leprechaun",
          symbol: "POB",
          balance: 487.23231454,
          stake: 1000.09083108,
          pendingUnstake: 0,
          delegationsIn: 0,
          delegationsOut: 0,
          pendingUndelegations: 0,
        },
        {
          _id: 78816,
          account: "foo",
          symbol: "LEO",
          balance: 6.818,
          stake: 0,
          pendingUnstake: 0,
          delegationsIn: 0,
          delegationsOut: 0,
          pendingUndelegations: 0,
        },
        {
          _id: 35962,
          account: "foo",
          symbol: "SAND",
          balance: 1,
          stake: 0,
          pendingUnstake: 0,
          delegationsIn: 0,
          delegationsOut: 0,
          pendingUndelegations: 0,
        },
      ],
      token_delegations: [
        {
          _id: 6871,
          from: "foo",
          to: "fullcolorpy",
          symbol: "POB",
          quantity: "1.00000000",
          created: 1631274507000,
          updated: 1631274507000,
        },
        {
          _id: 6872,
          from: "foo",
          to: "rentmoney",
          symbol: "POB",
          quantity: "1.00000000",
          created: 1631274639000,
          updated: 1631274639000,
        },
        {
          _id: 6873,
          from: "foo",
          to: "comandoyeya",
          symbol: "POB",
          quantity: "1.00000000",
          created: 1631274987000,
          updated: 1631274987000,
        },
        {
          _id: 6875,
          from: "foo",
          to: "marymmm",
          symbol: "POB",
          quantity: "1.00000000",
          created: 1631275908000,
          updated: 1631275908000,
        },
        {
          _id: 6876,
          from: "foo",
          to: "jlufer",
          symbol: "POB",
          quantity: "1.00000000",
          created: 1631276361000,
          updated: 1631276361000,
        },
      ],
    },
    points: {
      points: "10.000",
      uPoints: "0.000",
    },
    hiveEngineBalances: [],
  },
  hiveEngineTokensEnabled: ["POB"],
};

describe("(POB-1) Transfer POB", () => {
  const mode: TransferMode = "transfer";
  const asset: TransferAsset = "POB";

  const props = { ...HEPOBProps, mode, asset };

  const component = TestRenderer.create(<Transfer {...props} />);
  const instance: any = component.getInstance();

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(2) Step 2", () => {
    instance.setState({ step: 2, to: "bar" });
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(3) Step 3", () => {
    instance.setState({ step: 3 });
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(4) Step 4", () => {
    instance.setState({ step: 4 });
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(POB 7) Power up", () => {
  const mode: TransferMode = "power-up";
  const asset: TransferAsset = "POB";

  const props = {
    ...HEPOBProps,
    mode,
    asset,
  };

  const component = TestRenderer.create(<Transfer {...props} />);
  const instance: any = component.getInstance();

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(2) Step 2", () => {
    instance.setState({ step: 2, to: "bar" });
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(4) Step 4", () => {
    instance.setState({ step: 4 });
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(POB 8) Delegate", () => {
  const mode: TransferMode = "delegate";
  const asset: TransferAsset = "BP";

  const props = {
    ...HEPOBProps,
    mode,
    asset,
  };

  const component = TestRenderer.create(<Transfer {...props} />);
  const instance: any = component.getInstance();

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(2) Step 2", () => {
    instance.setState({ step: 2, to: "bar" });
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(4) Step 4", () => {
    instance.setState({ step: 4 });
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(9) Power down", () => {
  const mode: TransferMode = "power-down";
  const asset: TransferAsset = "BP";

  const props = {
    ...HEPOBProps,
    mode,
    asset,
  };

  const component = TestRenderer.create(<Transfer {...props} />);
  const instance: any = component.getInstance();
  instance.setState({ amount: "2.000" });

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(2) Step 2", () => {
    instance.setState({ step: 2, to: "bar" });
    expect(component.toJSON()).toMatchSnapshot();
  });

  it("(4) Step 4", () => {
    instance.setState({ step: 4 });
    expect(component.toJSON()).toMatchSnapshot();
  });
});

describe("(10) Powering down", () => {
  const mode: TransferMode = "power-down";
  const asset: TransferAsset = "BP";

  const props = {
    ...HEPOBProps,
    mode,
    asset,
    activeUser: {
      username: "foo",
      data: {
        ...fullAccountInstance,
        next_vesting_withdrawal: "2020-12-21T09:34:54",
        vesting_withdraw_rate: "525426.335537 VESTS",
        to_withdraw: "6830542361972",
        withdrawn: "6305116026444",
        name: "foo",
      },
      points: {
        points: "10.000",
        uPoints: "0.000",
      },
      hiveEngineBalances: [],
    },
  };

  const component = TestRenderer.create(<Transfer {...props} />);

  it("(1) Step 1", () => {
    expect(component.toJSON()).toMatchSnapshot();
  });
});
