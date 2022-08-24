import { NativeModules } from 'react-native';

import { DdSdkReactNative } from '../../DdSdkReactNative';
import { TimeProvider } from '../../TimeProvider';
import { DdRum, DdTrace } from '../../foundation';
import { RumActionType } from '../../types';
import { BufferSingleton } from '../Buffer/BufferSingleton';
import { DatadogProvider } from '../DatadogProvider';

import { renderWithProvider } from './__utils__/renderWithProvider';

jest.mock('../../TimeProvider', () => {
    const now = jest.fn();
    return {
        TimeProvider: jest.fn().mockImplementation(() => {
            return { now };
        })
    };
});
const nowMock = new TimeProvider().now;

const flushPromises = () => new Promise<void>(setImmediate);

describe('DatadogProvider', () => {
    afterEach(() => {
        jest.clearAllMocks();
        DdSdkReactNative['wasInitialized'] = false;
        DatadogProvider.isInitialized = false;
        BufferSingleton.reset();
        (nowMock as any).mockReturnValue('timestamp_not_specified');
    });
    describe('initialization', () => {
        it('renders its children and initializes the SDK once', async () => {
            const {
                getByText,
                rerenderWithRandomConfig
            } = renderWithProvider();
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
                    "telemetrySampleRate": undefined,
                    "trackingConsent": "granted",
                  },
                ]
            `);

            // Re-render
            rerenderWithRandomConfig();
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledTimes(1);
        });

        it('keeps events in the buffer then executes the buffer once initialization is done', async () => {
            // Given
            NativeModules.DdTrace.startSpan.mockReturnValueOnce('good_span_id');
            (nowMock as any).mockReturnValue('good_timestamp');
            await DdRum.addAction(RumActionType.TAP, 'fakeAction');

            // When
            const spanId = await DdTrace.startSpan('fakeOperation');
            await DdTrace.finishSpan(spanId);
            (nowMock as any).mockReturnValue('bad_timestamp');

            renderWithProvider();
            await flushPromises();

            // Then
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledTimes(1);
            expect(NativeModules.DdRum.addAction).toHaveBeenCalledTimes(1);
            expect(NativeModules.DdTrace.startSpan).toHaveBeenCalledTimes(1);
            expect(NativeModules.DdTrace.startSpan).toHaveBeenLastCalledWith(
                'fakeOperation',
                {},
                'good_timestamp'
            );
            expect(NativeModules.DdTrace.finishSpan).toHaveBeenCalledTimes(1);
            expect(NativeModules.DdTrace.finishSpan).toHaveBeenLastCalledWith(
                'good_span_id',
                {},
                'good_timestamp'
            );
        });
    });
});
