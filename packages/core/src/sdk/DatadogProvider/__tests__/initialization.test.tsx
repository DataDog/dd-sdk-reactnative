/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { version as reactNativeVersion } from 'react-native/package.json';
import { NativeModules } from 'react-native';

import { InitializationMode } from '../../../config/types';
import { DdLogs } from '../../../logs/DdLogs';
import { DdRum } from '../../../rum/DdRum';
import { PropagatorType, RumActionType } from '../../../rum/types';
import { DdTrace } from '../../../trace/DdTrace';
import { DefaultTimeProvider } from '../../../utils/time-provider/DefaultTimeProvider';
import { GlobalState } from '../../GlobalState/GlobalState';
import { BufferSingleton } from '../Buffer/BufferSingleton';
import {
    DatadogProvider,
    __internalResetIsInitializedForTesting
} from '../DatadogProvider';

import {
    getDefaultConfiguration,
    mockIdleCallback,
    renderWithProvider
} from './__utils__/renderWithProvider';

jest.mock('../../../utils/time-provider/DefaultTimeProvider', () => {
    const now = jest.fn();
    return {
        DefaultTimeProvider: jest.fn().mockImplementation(() => {
            return { now };
        })
    };
});

const nowMock = new DefaultTimeProvider().now;

const flushPromises = () =>
    new Promise<void>(jest.requireActual('timers').setImmediate);

describe('DatadogProvider', () => {
    afterEach(() => {
        jest.clearAllMocks();
        GlobalState.isInitialized = false;
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
                DdSdkNativeConfiguration {
                  "additionalConfiguration": {
                    "_dd.react_native_version": "${reactNativeVersion}",
                    "_dd.source": "react-native",
                  },
                  "attributeEncoders": [],
                  "batchProcessingLevel": "MEDIUM",
                  "batchSize": "MEDIUM",
                  "clientToken": "fakeToken",
                  "configurationForTelemetry": {
                    "initializationType": "SYNC",
                    "reactNativeVersion": "0.76.9",
                    "reactVersion": "18.3.1",
                    "trackErrors": true,
                    "trackInteractions": true,
                    "trackNetworkRequests": false,
                  },
                  "env": "fakeEnv",
                  "logsConfiguration": undefined,
                  "proxyConfiguration": undefined,
                  "rumConfiguration": RumConfiguration {
                    "actionEventMapper": null,
                    "actionNameAttribute": undefined,
                    "appHangThreshold": undefined,
                    "applicationId": "fakeApplicationId",
                    "customEndpoint": undefined,
                    "errorEventMapper": null,
                    "firstPartyHosts": [],
                    "initialResourceThreshold": undefined,
                    "longTaskThresholdMs": 0,
                    "nativeCrashReportEnabled": false,
                    "nativeInteractionTracking": false,
                    "nativeLongTaskThresholdMs": 200,
                    "nativeViewTracking": false,
                    "resourceEventMapper": null,
                    "resourceTraceSampleRate": 100,
                    "sessionSampleRate": 100,
                    "telemetrySampleRate": 20,
                    "trackBackgroundEvents": false,
                    "trackErrors": true,
                    "trackFrustrations": true,
                    "trackInteractions": true,
                    "trackMemoryWarnings": true,
                    "trackNonFatalAnrs": undefined,
                    "trackResources": false,
                    "trackWatchdogTerminations": false,
                    "useAccessibilityLabel": true,
                    "vitalsUpdateFrequency": "AVERAGE",
                  },
                  "service": undefined,
                  "site": "US1",
                  "traceConfiguration": undefined,
                  "trackingConsent": "granted",
                  "uploadFrequency": "AVERAGE",
                  "verbosity": undefined,
                }
            `);

            // Re-render
            rerenderWithRandomConfig();
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledTimes(1);
        });

        it('keeps events in the buffer then executes the buffer once initialization is done', async () => {
            // Given
            await DdLogs.info('fake_info_log');
            await DdLogs.debug('fake_debug_log');
            await DdLogs.warn('fake_wanr_log');
            await DdLogs.error('fake_error_log');
            NativeModules.DdTrace.startSpan.mockReturnValueOnce('good_span_id');
            (nowMock as any).mockReturnValue('good_timestamp');
            await DdRum.addAction(RumActionType.TAP, 'fakeAction');

            // When
            const spanId = await DdTrace.startSpan('fakeOperation');
            await DdTrace.finishSpan(spanId);
            (nowMock as any).mockReturnValue('bad_timestamp');

            // Then
            expect(NativeModules.DdLogs.info).not.toHaveBeenCalled();
            expect(NativeModules.DdLogs.debug).not.toHaveBeenCalled();
            expect(NativeModules.DdLogs.warn).not.toHaveBeenCalled();
            expect(NativeModules.DdLogs.error).not.toHaveBeenCalled();
            expect(NativeModules.DdRum.addAction).not.toHaveBeenCalled();
            expect(NativeModules.DdTrace.startSpan).not.toHaveBeenCalled();
            expect(NativeModules.DdTrace.finishSpan).not.toHaveBeenCalled();

            // When initialization
            renderWithProvider();
            await flushPromises();

            // Then
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledTimes(1);
            expect(NativeModules.DdLogs.info).toHaveBeenCalledTimes(1);
            expect(NativeModules.DdLogs.debug).toHaveBeenCalledTimes(1);
            expect(NativeModules.DdLogs.warn).toHaveBeenCalledTimes(1);
            expect(NativeModules.DdLogs.error).toHaveBeenCalledTimes(1);
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
            const idle = mockIdleCallback();
            try {
                const configuration = getDefaultConfiguration();
                configuration.initializationMode = InitializationMode.ASYNC;
                const { getByText } = renderWithProvider({
                    onInitialization,
                    configuration
                });
                getByText('I am a test application');
                await flushPromises();
                expect(onInitialization).not.toHaveBeenCalled();

                idle.flushIdleCallbacks();
                await flushPromises();
                expect(onInitialization).toHaveBeenCalledTimes(1);
            } finally {
                idle.restore();
            }
        });
        it('runs after initialization when partial initialization', async () => {
            const onInitialization = jest.fn();
            const { getByText } = renderWithProvider({
                onInitialization,
                configuration: {
                    rumConfiguration: {
                        trackErrors: true,
                        trackResources: true,
                        trackInteractions: true,
                        resourceTraceSampleRate: 100,
                        firstPartyHosts: [
                            {
                                match: 'api.com',
                                propagatorTypes: [
                                    PropagatorType.DATADOG,
                                    PropagatorType.TRACECONTEXT
                                ]
                            }
                        ]
                    },
                    traceConfiguration: {},
                    logsConfiguration: {}
                }
            });
            getByText('I am a test application');
            await flushPromises();
            expect(onInitialization).not.toHaveBeenCalled();

            await DatadogProvider.initialize({
                clientToken: 'fake-client-token',
                env: 'fake-env',
                rumConfiguration: {
                    applicationId: 'fake-application-id'
                }
            });
            await flushPromises();
            expect(onInitialization).toHaveBeenCalledTimes(1);
        });
    });
});
