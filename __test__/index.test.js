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
        expect.assertions(1);
        try {
         await Datadog.initialize("test");
         expect(NativeModules.RNSdkModule.initialize.mock.calls.length).toBe(1);
         done();
        } catch (ex) {
          console.error(ex);
        }
    });

    it('will init the Datadog SDK with endpoint url', async (done) => {
        expect.assertions(1);
        try {
          Datadog.initializeWithEndpoint("test","endpointUrl");
          expect(NativeModules.RNSdkModule.initializeWithEndpoint.mock.calls.length).toBe(1);
          done();
        } catch (ex) {
          console.error(ex);
        }
    });
});
