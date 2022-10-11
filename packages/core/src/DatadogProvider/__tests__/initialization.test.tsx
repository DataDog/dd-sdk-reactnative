import { NativeModules } from 'react-native';

import { InitializationMode } from '../../DdSdkReactNativeConfiguration';
import { DdSdkReactNative } from '../../DdSdkReactNative';
import { TimeProvider } from '../../TimeProvider';
import { DdRum, DdTrace } from '../../foundation';
import { RumActionType } from '../../types';
import { BufferSingleton } from '../Buffer/BufferSingleton';
import {
    DatadogProvider,
    __internalResetIsInitializedForTesting
} from '../DatadogProvider';

import {
    getDefaultConfiguration,
    mockAnimation,
    renderWithProvider
} from './__utils__/renderWithProvider';

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
        __internalResetIsInitializedForTesting();
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

            // We remove the sdk version from the configuration as it would require to update this snapshot
            const receivedConfiguration =
                NativeModules.DdSdk.initialize.mock.calls[0][0];
            delete receivedConfiguration.additionalConfig['_dd.sdk_version'];
            expect(receivedConfiguration).toMatchInlineSnapshot(`
                  DdSdkConfiguration {
                    "additionalConfig": Object {
                      "_dd.first_party_hosts": Array [],
                      "_dd.long_task.threshold": 200,
                      "_dd.native_view_tracking": false,
                      "_dd.source": "react-native",
                    },
                    "applicationId": "fakeApplicationId",
                    "clientToken": "fakeToken",
                    "env": "fakeEnv",
                    "nativeCrashReportEnabled": false,
                    "sampleRate": 100,
                    "site": "US1",
                    "telemetrySampleRate": undefined,
                    "trackingConsent": "granted",
                  }
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

            // Then
            expect(NativeModules.DdRum.addAction).not.toHaveBeenCalled();
            expect(NativeModules.DdTrace.startSpan).not.toHaveBeenCalled();
            expect(NativeModules.DdTrace.finishSpan).not.toHaveBeenCalled();

            // When initialization
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

    describe('onInitialization callback', () => {
        it('runs after initialization when SYNC initialization', async () => {
            const onInitialization = jest.fn();
            const { getByText } = renderWithProvider({ onInitialization });
            getByText('I am a test application');
            expect(onInitialization).not.toHaveBeenCalled();

            await flushPromises();
            expect(onInitialization).toHaveBeenCalledTimes(1);
        });

        it('runs after initialization when ASYNC initialization', async () => {
            const onInitialization = jest.fn();
            const { finishAnimation } = mockAnimation();
            const configuration = getDefaultConfiguration();
            configuration.initializationMode = InitializationMode.ASYNC;
            const { getByText } = renderWithProvider({
                onInitialization,
                configuration
            });
            getByText('I am a test application');
            await flushPromises();
            expect(onInitialization).not.toHaveBeenCalled();

            finishAnimation();
            await flushPromises();
            expect(onInitialization).toHaveBeenCalledTimes(1);
        });
        it('runs after initialization when partial initialization', async () => {
            const onInitialization = jest.fn();
            const { getByText } = renderWithProvider({
                onInitialization,
                configuration: {
                    trackErrors: true,
                    trackResources: true,
                    trackInteractions: true,
                    firstPartyHosts: ['api.com'],
                    resourceTracingSamplingRate: 100
                }
            });
            getByText('I am a test application');
            await flushPromises();
            expect(onInitialization).not.toHaveBeenCalled();

            await DatadogProvider.initialize({
                applicationId: 'fake-application-id',
                clientToken: 'fake-client-token',
                env: 'fake-env'
            });
            await flushPromises();
            expect(onInitialization).toHaveBeenCalledTimes(1);
        });
    });
});
