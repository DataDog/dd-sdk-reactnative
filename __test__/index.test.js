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
    RNSdkModule: { initialize: jest.fn(async () => {}) },
    RNSdkModule: { initializeWithEndpoint: jest.fn(async () => {}) },
  },
}));

describe('Test SDK', () => {
    it('will init the Datadog SDK', async (done) => {
        try {
          Datadog.initialize("test");
          done();
        } catch (ex) {
          console.error(ex);
        }
    });

    it('will init the Datadog SDK with endpoint url', async (done) => {
        try {
          Datadog.initializeWithEndpoint("test","endpointUrl");
          done();
        } catch (ex) {
          console.error(ex);
        }
    });
});
