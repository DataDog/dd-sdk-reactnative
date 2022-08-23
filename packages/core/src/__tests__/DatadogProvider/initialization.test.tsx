import { NativeModules } from 'react-native';

import { renderWithProvider } from './__utils__/renderWithProvider';

describe('DatadogProvider', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });
    describe('initialization', () => {
        it('renders its children and initializes the SDK', () => {
            const { getByText } = renderWithProvider();
            getByText('I am a test application');
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledTimes(1);
            expect(NativeModules.DdSdk.initialize.mock.calls[0])
                .toMatchInlineSnapshot(`
                Array [
                  DdSdkConfiguration {
                    "additionalConfig": Object {
                      "_dd.first_party_hosts": Array [],
                      "_dd.long_task.threshold": 200,
                      "_dd.native_view_tracking": false,
                      "_dd.sdk_version": "1.0.0",
                      "_dd.source": "react-native",
                    },
                    "applicationId": "fakeApplicationId",
                    "clientToken": "fakeToken",
                    "env": "fakeEnv",
                    "nativeCrashReportEnabled": false,
                    "sampleRate": 100,
                    "site": "US",
                    "trackingConsent": "granted",
                  },
                ]
            `);
        });
    });
});
