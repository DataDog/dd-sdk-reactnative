/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { InitializationMode } from '../../../DdSdkReactNativeConfiguration';
import { DdSdkReactNative } from '../../../DdSdkReactNative';
import { DdRum } from '../../../rum/DdRum';
import { RumActionType } from '../../../rum/types';
import { DdTrace } from '../../../trace/DdTrace';
import { TimeProvider } from '../../../utils/TimeProvider';
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

jest.mock('../../../utils/TimeProvider', () => {
    const now = jest.fn();
    return {
        TimeProvider: jest.fn().mockImplementation(() => {
            return { now };
        })
    };
});
const nowMock = new TimeProvider().now;

const flushPromises = () =>
    new Promise<void>(jest.requireActual('timers').setImmediate);

describe('DatadogProvider', () => {
    afterEach(() => {
        jest.clearAllMocks();
        DdSdkReactNative['_isInitialized'] = false;
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
            delete receivedConfiguration.additionalConfiguration[
                '_dd.sdk_version'
            ];
            expect(receivedConfiguration).toMatchInlineSnapshot(`
                DdSdkConfiguration {
                  "additionalConfiguration": {
                    "_dd.source": "react-native",
                  },
                  "applicationId": "fakeApplicationId",
                  "batchSize": "MEDIUM",
                  "bundleLogsWithRum": true,
                  "bundleLogsWithTraces": true,
                  "clientToken": "fakeToken",
                  "configurationForTelemetry": {
                    "initializationType": "SYNC",
                    "reactNativeVersion": "0.73.6",
                    "reactVersion": "18.2.0",
                    "trackErrors": true,
                    "trackInteractions": true,
                    "trackNetworkRequests": false,
                  },
                  "customEndpoints": {},
                  "env": "fakeEnv",
                  "firstPartyHosts": [],
                  "longTaskThresholdMs": 0,
                  "nativeCrashReportEnabled": false,
                  "nativeInteractionTracking": false,
                  "nativeLongTaskThresholdMs": 200,
                  "nativeViewTracking": false,
                  "proxyConfig": undefined,
                  "sampleRate": 100,
                  "serviceName": undefined,
                  "site": "US1",
                  "telemetrySampleRate": 20,
                  "trackBackgroundEvents": false,
                  "trackFrustrations": true,
                  "trackingConsent": "granted",
                  "uploadFrequency": "AVERAGE",
                  "verbosity": undefined,
                  "vitalsUpdateFrequency": "AVERAGE",
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
