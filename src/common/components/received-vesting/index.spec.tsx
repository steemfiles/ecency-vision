import React from 'react';

import {List} from './index';
import renderer from 'react-test-renderer';
import {createBrowserHistory} from 'history';

import {
  dynamicPropsIntance1,
  receivedVestingInstance,
  globalInstance,
  allOver,
} from '../../helper/test-helper';

jest.mock('../../constants/defaults.json', () => ({
  imageServer: 'https://images.ecency.com',
}));

let MOCK_MODE = 1;

jest.mock('../../api/private-api', () => ({
  getReceivedVestingShares: () =>
    new Promise(resolve => {
      if (MOCK_MODE === 1) {
        resolve(receivedVestingInstance);
      }

      if (MOCK_MODE === 2) {
        resolve([]);
      }
    }),
}));

const defaultProps = {
  global: globalInstance,
  history: createBrowserHistory(),
  account: {name: 'foo'},
  dynamicProps: dynamicPropsIntance1,
  addAccount: () => {},
  onHide: () => {},
};

it('(1) Default render', async () => {
  const component = renderer.create(<List {...defaultProps} />);
  await allOver();
  expect(component.toJSON()).toMatchSnapshot();
});

it('(2) Empty list', async () => {
  MOCK_MODE = 2;
  const component = renderer && renderer.create(<List {...defaultProps} />);
  await allOver();
  expect(component.toJSON()).toMatchSnapshot();
});
