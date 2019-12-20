// TODO: Fix this test in the next PR




//jest.mock('../index', () => ({
//  ...jest.requireActual('../index'),
//  init: jest.fn(async () => {}),
//  }));

import {
  NativeModules
} from 'react-native';

import Datadog from "../index";

jest.mock('react-native', () => ({
  NativeModules: {
    RNSdkModule: { init: jest.fn(async () => {}) },
    RNSdkModule: { initWithEndpoint: jest.fn(async () => {}) },
  },
}));

describe('Test SDK', () => {
    it('will init the Datadog SDK', async (done) => {
        try {
          Datadog.init("test");
          done();
        } catch (ex) {
          console.error(ex);
        }
    });

    it('will init the Datadog SDK with endpoint url', async (done) => {
        try {
          Datadog.initWithEndpoint("test","endpointUrl");
          done();
        } catch (ex) {
          console.error(ex);
        }
    });
});
