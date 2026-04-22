/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { version as reactNativeVersion } from 'react-native/package.json';
import { NativeModules } from 'react-native';

import { DdSdkReactNative } from '../DdSdkReactNative';
import type { DdSdkNativeConfiguration } from '../config/features/CoreConfigurationNative';
import { CoreConfiguration } from '../config/features/CoreConfiguration';
import { LogsConfiguration } from '../config/features/LogsConfiguration';
import { RumConfiguration } from '../config/features/RumConfiguration';
import { TraceConfiguration } from '../config/features/TraceConfiguration';
import { TrackingConsent } from '../config/types/TrackingConsent';
import { ProxyConfiguration, ProxyType, SdkVerbosity } from '../config/types';
import { DdLogs } from '../logs/DdLogs';
import { DdRum } from '../rum/DdRum';
import { DdRumErrorTracking } from '../rum/instrumentation/DdRumErrorTracking';
import { DdRumUserInteractionTracking } from '../rum/instrumentation/interactionTracking/DdRumUserInteractionTracking';
import { DdRumResourceTracking } from '../rum/instrumentation/resourceTracking/DdRumResourceTracking';
import { PropagatorType, RumActionType } from '../rum/types';
import { AttributesSingleton } from '../sdk/AttributesSingleton/AttributesSingleton';
import { NativeDdSdk } from '../sdk/DdSdkInternal';
import { GlobalState } from '../sdk/GlobalState/GlobalState';
import { UserInfoSingleton } from '../sdk/UserInfoSingleton/UserInfoSingleton';
import type { LogEvent } from '../types';
import { ErrorSource } from '../types';
import { version as sdkVersion } from '../version';

jest.mock('../InternalLog');

jest.mock(
    '../rum/instrumentation/interactionTracking/DdRumUserInteractionTracking',
    () => {
        return {
            DdRumUserInteractionTracking: {
                startTracking: jest.fn().mockImplementation(() => {})
            }
        };
    }
);

jest.mock(
    '../rum/instrumentation/resourceTracking/DdRumResourceTracking',
    () => {
        return {
            DdRumResourceTracking: {
                startTracking: jest.fn().mockImplementation(() => {})
            }
        };
    }
);

jest.mock('../rum/instrumentation/DdRumErrorTracking', () => {
    return {
        DdRumErrorTracking: {
            startTracking: jest.fn().mockImplementation(() => {})
        }
    };
});

beforeEach(async () => {
    GlobalState.isInitialized = false;
    DdSdkReactNative['wasAutoInstrumented'] = false;
    NativeModules.DdSdk.initialize.mockClear();
    NativeModules.DdSdk.addAttributes.mockClear();
    NativeModules.DdSdk.setTrackingConsent.mockClear();
    NativeModules.DdSdk.onRUMSessionStarted.mockClear();

    (DdRumUserInteractionTracking.startTracking as jest.MockedFunction<
        typeof DdRumUserInteractionTracking.startTracking
    >).mockClear();
    (DdRumResourceTracking.startTracking as jest.MockedFunction<
        typeof DdRumResourceTracking.startTracking
    >).mockClear();
    (DdRumErrorTracking.startTracking as jest.MockedFunction<
        typeof DdRumErrorTracking.startTracking
    >).mockClear();
    DdLogs.unregisterLogEventMapper();

    UserInfoSingleton.reset();
    AttributesSingleton.reset();
});

describe('DdSdkReactNative', () => {
    describe('initialization', () => {
        it('initializes the SDK when initialize', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(fakeAppId);
            configuration.logsConfiguration = new LogsConfiguration();

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.rumConfiguration?.applicationId).toBe(
                fakeAppId
            );
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.trackingConsent).toBe(
                TrackingConsent.GRANTED
            );
            expect(
                ddSdkConfiguration.rumConfiguration?.nativeInteractionTracking
            ).toBe(false);
            expect(
                ddSdkConfiguration.rumConfiguration?.nativeViewTracking
            ).toBe(false);
            expect(
                ddSdkConfiguration.rumConfiguration?.firstPartyHosts
            ).toEqual([]);
            expect(
                ddSdkConfiguration.logsConfiguration?.bundleLogsWithRum
            ).toBe(true);
            expect(
                ddSdkConfiguration.logsConfiguration?.bundleLogsWithTraces
            ).toBe(true);

            expect(ddSdkConfiguration.additionalConfiguration).toStrictEqual({
                '_dd.react_native_version': reactNativeVersion,
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion
            });
        });

        it('gives rejection when initialize', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(fakeAppId);

            NativeModules.DdSdk.initialize.mockRejectedValue('rejection');

            // WHEN
            await expect(
                DdSdkReactNative.initialize(configuration)
            ).rejects.toMatch('rejection');

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.rumConfiguration?.applicationId).toBe(
                fakeAppId
            );
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.trackingConsent).toBe(
                TrackingConsent.GRANTED
            );
            expect(ddSdkConfiguration.additionalConfiguration).toStrictEqual({
                '_dd.react_native_version': reactNativeVersion,
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion
            });

            expect(GlobalState.isInitialized).toBe(false);
            expect(
                DdRumUserInteractionTracking.startTracking
            ).toHaveBeenCalledTimes(0);
            expect(DdRumResourceTracking.startTracking).toHaveBeenCalledTimes(
                0
            );
            expect(DdRumErrorTracking.startTracking).toHaveBeenCalledTimes(0);
        });

        it('initializes the SDK when initialize { explicit tracking consent }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const fakeConsent = TrackingConsent.NOT_GRANTED;
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeConsent
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                false,
                false
            );

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.rumConfiguration?.applicationId).toBe(
                fakeAppId
            );
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.trackingConsent).toBe(fakeConsent);
            expect(ddSdkConfiguration.additionalConfiguration).toStrictEqual({
                '_dd.react_native_version': reactNativeVersion,
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion
            });
        });

        it('initializes once when initialize { multiple times in a row }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );

            configuration.rumConfiguration = new RumConfiguration(fakeAppId);

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);
            await DdSdkReactNative.initialize(configuration);
            await DdSdkReactNative.initialize(configuration);
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.rumConfiguration?.applicationId).toBe(
                fakeAppId
            );
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.additionalConfiguration).toStrictEqual({
                '_dd.react_native_version': reactNativeVersion,
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion
            });
        });

        it('logs a warning when initialize { with socks proxy config + proxy credentials }', async () => {
            // GIVEN
            const spyConsoleWarn = jest
                .spyOn(console, 'warn')
                .mockImplementation();

            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const proxyType = ProxyType.SOCKS;
            const proxyAddress = '1.1.1.1';
            const proxyPort = 8080;
            const proxyUsername = 'foo';
            const proxyPassword = 'bar';

            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                false,
                false
            );
            configuration.proxyConfiguration = new ProxyConfiguration(
                proxyType,
                proxyAddress,
                proxyPort,
                proxyUsername,
                proxyPassword
            );

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            try {
                // WHEN
                await DdSdkReactNative.initialize(configuration);

                // THEN
                expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(
                    1
                );
                const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                    .calls[0][0] as DdSdkNativeConfiguration;
                expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
                expect(ddSdkConfiguration.rumConfiguration?.applicationId).toBe(
                    fakeAppId
                );
                expect(ddSdkConfiguration.env).toBe(fakeEnvName);
                expect(ddSdkConfiguration.proxyConfiguration).toEqual({
                    type: proxyType,
                    address: proxyAddress,
                    port: proxyPort
                });
                expect(
                    ddSdkConfiguration.additionalConfiguration
                ).toStrictEqual({
                    '_dd.react_native_version': reactNativeVersion,
                    '_dd.source': 'react-native',
                    '_dd.sdk_version': sdkVersion
                });
                expect(spyConsoleWarn).toHaveBeenCalledTimes(1);
            } finally {
                spyConsoleWarn.mockRestore();
            }
        });

        it('initializes with default sessionSampleRate when not specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(fakeAppId);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledWith(
                expect.objectContaining({
                    rumConfiguration: expect.objectContaining({
                        sessionSampleRate: 100
                    })
                })
            );
        });

        it('initializes with sessionSampleRate when it is specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';

            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(fakeAppId);
            configuration.rumConfiguration.sessionSampleRate = 0;

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledWith(
                expect.objectContaining({
                    rumConfiguration: expect.objectContaining({
                        sessionSampleRate: 0
                    })
                })
            );
        });

        it('initializes with sessionSampleRate when it is specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(fakeAppId);
            configuration.rumConfiguration.sessionSampleRate = 70;

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledWith(
                expect.objectContaining({
                    rumConfiguration: expect.objectContaining({
                        sessionSampleRate: 70
                    })
                })
            );
        });

        it('initializes with bundleLogsWithRum false when it is specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(fakeAppId);
            configuration.logsConfiguration = new LogsConfiguration();
            configuration.logsConfiguration.bundleLogsWithRum = false;

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(
                ddSdkConfiguration.logsConfiguration?.bundleLogsWithRum
            ).toBe(false);
        });

        it('initializes with bundleLogsWithTraces false when it is specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(fakeAppId);
            configuration.logsConfiguration = new LogsConfiguration();
            configuration.logsConfiguration.bundleLogsWithTraces = false;

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(
                ddSdkConfiguration.logsConfiguration?.bundleLogsWithTraces
            ).toBe(false);
        });

        it('initializes with the version when a version is specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(fakeAppId);
            configuration.version = '2.0.0';

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(
                (ddSdkConfiguration.additionalConfiguration as {
                    '_dd.version': string;
                })['_dd.version']
            ).toBe('2.0.0');
        });

        it('initialized with a version suffix when a version suffix is specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(fakeAppId);
            configuration.versionSuffix = 'codepush-3';

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(
                (ddSdkConfiguration.additionalConfiguration as {
                    '_dd.version': string;
                })['_dd.version']
            ).toBeUndefined();
            expect(
                (ddSdkConfiguration.additionalConfiguration as {
                    '_dd.version_suffix': string;
                })['_dd.version_suffix']
            ).toBe('-codepush-3');
        });

        it('initializes with the version when a version and version suffix are specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(fakeAppId);
            configuration.version = '2.0.0';
            configuration.versionSuffix = 'codepush-3';

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(
                (ddSdkConfiguration.additionalConfiguration as {
                    '_dd.version': string;
                })['_dd.version']
            ).toBe('2.0.0-codepush-3');
            expect(
                (ddSdkConfiguration.additionalConfiguration as {
                    '_dd.version_suffix': string;
                })['_dd.version_suffix']
            ).toBeUndefined();
        });

        it('initializes with initialResourceThreshold when it is specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(fakeAppId);
            configuration.rumConfiguration.initialResourceThreshold = 0.123;

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledWith(
                expect.objectContaining({
                    rumConfiguration: expect.objectContaining({
                        initialResourceThreshold: 0.123
                    })
                })
            );
        });
    });

    describe('feature enablement', () => {
        it('enables user interaction feature when initialize { user interaction config enabled }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                true
            );

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.rumConfiguration?.applicationId).toBe(
                fakeAppId
            );
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.additionalConfiguration).toStrictEqual({
                '_dd.react_native_version': reactNativeVersion,
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion
            });
            expect(
                DdRumUserInteractionTracking.startTracking
            ).toHaveBeenCalledTimes(1);
        });

        it('enables resource tracking feature when initialize { resource tracking config enabled }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                true
            );
            configuration.rumConfiguration.resourceTraceSampleRate = 42;
            configuration.rumConfiguration.firstPartyHosts = [
                {
                    match: 'api.example.com',
                    propagatorTypes: [
                        PropagatorType.DATADOG,
                        PropagatorType.TRACECONTEXT
                    ]
                },
                {
                    match: 'something.fr',
                    propagatorTypes: [PropagatorType.DATADOG]
                }
            ];

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.rumConfiguration?.applicationId).toBe(
                fakeAppId
            );
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(
                ddSdkConfiguration.rumConfiguration?.firstPartyHosts
            ).toEqual([
                {
                    match: 'api.example.com',
                    propagatorTypes: ['datadog', 'tracecontext']
                },
                {
                    match: 'something.fr',
                    propagatorTypes: ['datadog']
                }
            ]);
            expect(ddSdkConfiguration.additionalConfiguration).toStrictEqual({
                '_dd.react_native_version': reactNativeVersion,
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion
            });
            expect(DdRumResourceTracking.startTracking).toHaveBeenCalledTimes(
                1
            );
            expect(DdRumResourceTracking.startTracking).toHaveBeenCalledWith({
                resourceTraceSampleRate: 42,
                firstPartyHosts: [
                    {
                        match: 'api.example.com',
                        propagatorTypes: ['datadog', 'tracecontext']
                    },
                    {
                        match: 'something.fr',
                        propagatorTypes: ['datadog']
                    }
                ]
            });
        });

        it('enables error tracking feature when initialize { error tracking config enabled }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                false,
                true
            );
            configuration.rumConfiguration.resourceTraceSampleRate = 2;
            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.rumConfiguration?.applicationId).toBe(
                fakeAppId
            );
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.additionalConfiguration).toStrictEqual({
                '_dd.react_native_version': reactNativeVersion,
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion
            });
            expect(DdRumErrorTracking.startTracking).toHaveBeenCalledTimes(1);
        });

        it('enables logs mapping when initialize { logs mapper enabled }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                false,
                true
            );
            configuration.logsConfiguration = new LogsConfiguration({
                logEventMapper: (log: LogEvent) => {
                    log.message = 'new message';
                    return log;
                }
            });

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);
            await DdLogs.debug('original message');

            // THEN
            expect(NativeModules.DdLogs.debug).toHaveBeenCalledWith(
                'new message',
                {}
            );
        });

        it('enables error mapping when initialize { error mapper enabled }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                false,
                true
            );
            configuration.rumConfiguration.errorEventMapper = event => {
                event.message = 'new error massage';
                return event;
            };

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);
            await DdRum.addError(
                'original message',
                ErrorSource.CUSTOM,
                'stack',
                {},
                456
            );

            // THEN
            expect(NativeModules.DdRum.addError).toHaveBeenCalledWith(
                'new error massage',
                'CUSTOM',
                'stack',
                {
                    '_dd.error.source_type': 'react-native'
                },
                456,
                ''
            );
        });

        it('enables resource mapping when initialize { resource mapper enabled }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                false,
                true
            );
            configuration.rumConfiguration.resourceEventMapper = event => {
                event.context = {
                    ...event.context,
                    body: 'content'
                };
                return event;
            };

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);
            await DdRum.startResource(
                'key',
                'GET',
                'https://datadoghq.com',
                {},
                234
            );
            await DdRum.stopResource('key', 200, 'xhr', 22, {}, 345);

            // THEN
            expect(NativeModules.DdRum.stopResource).toHaveBeenCalledWith(
                'key',
                200,
                'xhr',
                22,
                {
                    body: 'content'
                },
                345
            );
        });

        it('enables action mapping when initialize { action mapper enabled }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                false,
                true
            );
            configuration.rumConfiguration.actionEventMapper = event => {
                event.context = {
                    ...event.context,
                    body: 'content'
                };
                return event;
            };

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);
            await DdRum.addAction(
                RumActionType.CUSTOM,
                'Click on button',
                {},
                234
            );

            // THEN
            expect(NativeModules.DdRum.addAction).toHaveBeenCalledWith(
                'CUSTOM',
                'Click on button',
                null,
                {
                    body: 'content'
                },
                234
            );
        });

        it('enables custom service name when initialize { service name }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const fakeService = 'aFakeService';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                false,
                true
            );
            configuration.service = fakeService;

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.rumConfiguration?.applicationId).toBe(
                fakeAppId
            );
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.service).toBe(fakeService);
            expect(ddSdkConfiguration.additionalConfiguration).toStrictEqual({
                '_dd.react_native_version': reactNativeVersion,
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion
            });
            expect(DdRumErrorTracking.startTracking).toHaveBeenCalledTimes(1);
        });

        it('enables sdk verbosity when initialize { sdk verbosity }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                false,
                true
            );
            configuration.verbosity = SdkVerbosity.DEBUG;

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.rumConfiguration?.applicationId).toBe(
                fakeAppId
            );
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.verbosity).toBe(SdkVerbosity.DEBUG);
            expect(ddSdkConfiguration.additionalConfiguration).toStrictEqual({
                '_dd.react_native_version': reactNativeVersion,
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion
            });
            expect(DdRumErrorTracking.startTracking).toHaveBeenCalledTimes(1);
        });

        it('enables native view tracking when initialize { native_view_tracking enabled }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                false,
                true
            );
            configuration.rumConfiguration.nativeViewTracking = true;

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.rumConfiguration?.applicationId).toBe(
                fakeAppId
            );
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(
                ddSdkConfiguration.rumConfiguration?.nativeViewTracking
            ).toBe(true);
            expect(ddSdkConfiguration.additionalConfiguration).toStrictEqual({
                '_dd.react_native_version': reactNativeVersion,
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion
            });
            expect(DdRumErrorTracking.startTracking).toHaveBeenCalledTimes(1);
        });

        it('enables native interaction tracking when initialize { native_interaction_tracking enabled }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                false,
                true
            );
            configuration.rumConfiguration.nativeInteractionTracking = true;

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.rumConfiguration?.applicationId).toBe(
                fakeAppId
            );
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(
                ddSdkConfiguration.rumConfiguration?.nativeInteractionTracking
            ).toBe(true);
            expect(ddSdkConfiguration.additionalConfiguration).toStrictEqual({
                '_dd.react_native_version': reactNativeVersion,
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion
            });
            expect(DdRumErrorTracking.startTracking).toHaveBeenCalledTimes(1);
        });

        it('enables long task tracking when initialize { native and javascript long task custom threshold }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                false,
                true
            );
            configuration.rumConfiguration.nativeLongTaskThresholdMs = 234;
            configuration.rumConfiguration.longTaskThresholdMs = 456;

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(
                ddSdkConfiguration.rumConfiguration?.nativeLongTaskThresholdMs
            ).toBe(234);
            expect(
                ddSdkConfiguration.rumConfiguration?.longTaskThresholdMs
            ).toBe(456);
        });

        it('enables long task tracking when initialize { native and javascript long task false threshold }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                false,
                true
            );
            configuration.rumConfiguration.nativeLongTaskThresholdMs = 0;
            configuration.rumConfiguration.longTaskThresholdMs = false;

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(
                ddSdkConfiguration.rumConfiguration?.nativeLongTaskThresholdMs
            ).toBe(0);
            expect(
                ddSdkConfiguration.rumConfiguration?.longTaskThresholdMs
            ).toBe(0);
        });

        it('enables custom endpoints when initialize { custom endpoints specified }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new CoreConfiguration(
                fakeClientToken,
                fakeEnvName
            );
            configuration.rumConfiguration = new RumConfiguration(
                fakeAppId,
                false,
                false,
                true
            );
            configuration.rumConfiguration.customEndpoint =
                'https://rum.example.com/';
            configuration.logsConfiguration = new LogsConfiguration();
            configuration.logsConfiguration.customEndpoint =
                'https://logs.example.com/';
            configuration.traceConfiguration = new TraceConfiguration();
            configuration.traceConfiguration.customEndpoint =
                'https://trace.example.com/';

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkNativeConfiguration;
            expect(ddSdkConfiguration.rumConfiguration?.customEndpoint).toEqual(
                'https://rum.example.com/'
            );
            expect(
                ddSdkConfiguration.logsConfiguration?.customEndpoint
            ).toEqual('https://logs.example.com/');
            expect(
                ddSdkConfiguration.traceConfiguration?.customEndpoint
            ).toEqual('https://trace.example.com/');
        });
    });

    describe('addAttribute', () => {
        it('calls SDK method when addAttribute', async () => {
            // GIVEN
            const key = 'foo';
            const value = 'bar';

            // WHEN

            await DdSdkReactNative.addAttribute(key, value);

            // THEN
            expect(NativeDdSdk.addAttribute).toHaveBeenCalledTimes(1);
            expect(NativeDdSdk.addAttribute).toHaveBeenCalledWith(key, {
                value
            });
            expect(AttributesSingleton.getInstance().getAttribute(key)).toEqual(
                value
            );
        });
    });

    describe('removeAttribute', () => {
        it('calls SDK method when removeAttribute', async () => {
            // GIVEN
            const key = 'foo';
            const value = 'bar';
            await DdSdkReactNative.addAttribute(key, value);

            // WHEN
            await DdSdkReactNative.removeAttribute(key);

            // THEN
            expect(NativeDdSdk.removeAttribute).toHaveBeenCalledTimes(1);
            expect(NativeDdSdk.removeAttribute).toHaveBeenCalledWith(key);
            expect(AttributesSingleton.getInstance().getAttribute(key)).toEqual(
                undefined
            );
        });
    });

    describe('addAttributes', () => {
        it('calls SDK method when addAttributes', async () => {
            // GIVEN
            const attributes = { foo: 'bar' };

            // WHEN

            await DdSdkReactNative.addAttributes(attributes);

            // THEN
            expect(NativeDdSdk.addAttributes).toHaveBeenCalledTimes(1);
            expect(NativeDdSdk.addAttributes).toHaveBeenCalledWith(attributes);
            expect(AttributesSingleton.getInstance().getAttributes()).toEqual({
                foo: 'bar'
            });
        });
    });

    describe('removeAttributes', () => {
        it('calls SDK method when removeAttributes', async () => {
            // GIVEN
            const attributes = { foo: 'bar', baz: 'quux' };
            await DdSdkReactNative.addAttributes(attributes);

            // WHEN
            await DdSdkReactNative.removeAttributes(['foo', 'baz']);

            // THEN
            expect(NativeDdSdk.removeAttributes).toHaveBeenCalledTimes(1);
            expect(NativeDdSdk.removeAttributes).toHaveBeenCalledWith([
                'foo',
                'baz'
            ]);
            expect(AttributesSingleton.getInstance().getAttributes()).toEqual(
                {}
            );
        });
    });

    describe('setUserInfo', () => {
        it('calls SDK method when setUserInfo, and sets the user in UserProvider', async () => {
            // GIVEN
            const userInfo = {
                id: 'id',
                name: 'name',
                email: 'email',
                extraInfo: {
                    foo: 'bar'
                }
            };

            // WHEN
            await DdSdkReactNative.setUserInfo(userInfo);

            // THEN
            expect(NativeDdSdk.setUserInfo).toHaveBeenCalledTimes(1);
            expect(NativeDdSdk.setUserInfo).toHaveBeenCalledWith(userInfo);
            expect(UserInfoSingleton.getInstance().getUserInfo()).toEqual(
                userInfo
            );
        });
    });

    describe('addUserExtraInfo', () => {
        it('calls SDK method when addUserExtraInfo, and updates the user in UserProvider', async () => {
            // GIVEN
            await DdSdkReactNative.setUserInfo({
                id: 'id',
                extraInfo: { type: 'premium' }
            });
            const extraInfo = { foo: 'bar' };

            // WHEN
            await DdSdkReactNative.addUserExtraInfo(extraInfo);

            // THEN
            expect(NativeDdSdk.addUserExtraInfo).toHaveBeenCalledTimes(1);
            expect(NativeDdSdk.addUserExtraInfo).toHaveBeenCalledWith(
                extraInfo
            );
            expect(UserInfoSingleton.getInstance().getUserInfo()).toEqual({
                id: 'id',
                extraInfo: {
                    foo: 'bar',
                    type: 'premium'
                }
            });
        });
    });

    describe('clearUserInfo', () => {
        it('calls SDK method when clearUserInfo, and clears the user in UserProvider', async () => {
            // GIVEN
            const userInfo = {
                id: 'id',
                name: 'name',
                email: 'email',
                extraInfo: {
                    foo: 'bar'
                }
            };

            await DdSdkReactNative.setUserInfo(userInfo);

            // WHEN
            await DdSdkReactNative.clearUserInfo();

            // THEN
            expect(NativeDdSdk.clearUserInfo).toHaveBeenCalledTimes(1);
            expect(NativeDdSdk.setUserInfo).toHaveBeenCalled();
            expect(UserInfoSingleton.getInstance().getUserInfo()).toEqual(
                undefined
            );
        });
    });

    describe('setTrackingConsent', () => {
        it('calls SDK method when setTrackingConsent', async () => {
            // GIVEN
            const consent = TrackingConsent.PENDING;

            // WHEN

            DdSdkReactNative.setTrackingConsent(consent);

            // THEN
            expect(NativeDdSdk.setTrackingConsent).toHaveBeenCalledTimes(1);
            expect(NativeDdSdk.setTrackingConsent).toHaveBeenCalledWith(
                consent
            );
        });
    });

    describe('clearAllData', () => {
        it('calls SDK method when clearAllData', async () => {
            // WHEN
            DdSdkReactNative.clearAllData();

            // THEN
            expect(NativeDdSdk.clearAllData).toHaveBeenCalledTimes(1);
        });
    });

    describe.each([[ProxyType.HTTP], [ProxyType.HTTPS], [ProxyType.SOCKS]])(
        'proxy configs test, no auth',
        proxyType => {
            it(`M set proxy configuration when initialize { + proxy config, w/o proxy credentials, proxyType=${proxyType} }`, async () => {
                // GIVEN
                const fakeAppId = '1';
                const fakeClientToken = '2';
                const fakeEnvName = 'env';
                const proxyAddress = '1.1.1.1';
                const proxyPort = 8080;

                const configuration = new CoreConfiguration(
                    fakeClientToken,
                    fakeEnvName
                );
                configuration.rumConfiguration = new RumConfiguration(
                    fakeAppId,
                    false,
                    false,
                    false
                );

                configuration.proxyConfiguration = {
                    type: proxyType,
                    address: proxyAddress,
                    port: proxyPort
                };

                NativeModules.DdSdk.initialize.mockResolvedValue(null);

                // WHEN
                await DdSdkReactNative.initialize(configuration);

                // THEN
                expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(
                    1
                );
                const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                    .calls[0][0] as DdSdkNativeConfiguration;
                expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
                expect(ddSdkConfiguration.rumConfiguration?.applicationId).toBe(
                    fakeAppId
                );
                expect(ddSdkConfiguration.env).toBe(fakeEnvName);
                expect(ddSdkConfiguration.proxyConfiguration).toStrictEqual({
                    type: proxyType,
                    address: proxyAddress,
                    port: proxyPort
                });
                expect(
                    ddSdkConfiguration.additionalConfiguration
                ).toStrictEqual({
                    '_dd.react_native_version': reactNativeVersion,
                    '_dd.source': 'react-native',
                    '_dd.sdk_version': sdkVersion
                });
            });
        }
    );

    describe.each([[ProxyType.HTTP], [ProxyType.HTTPS]])(
        'proxy configs test + auth',
        proxyType => {
            it(`M set proxy configuration when initialize { with proxy config + proxy credentials, proxyType=${proxyType} }`, async () => {
                // GIVEN
                const fakeAppId = '1';
                const fakeClientToken = '2';
                const fakeEnvName = 'env';

                const proxyAddress = '1.1.1.1';
                const proxyPort = 8080;
                const proxyUsername = 'foo';
                const proxyPassword = 'bar';

                const configuration = new CoreConfiguration(
                    fakeClientToken,
                    fakeEnvName
                );
                configuration.rumConfiguration = new RumConfiguration(
                    fakeAppId,
                    false,
                    false,
                    false
                );

                configuration.proxyConfiguration = {
                    type: proxyType,
                    address: proxyAddress,
                    port: proxyPort,
                    username: proxyUsername,
                    password: proxyPassword
                };

                NativeModules.DdSdk.initialize.mockResolvedValue(null);

                // WHEN
                await DdSdkReactNative.initialize(configuration);

                // THEN
                expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(
                    1
                );
                const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                    .calls[0][0] as DdSdkNativeConfiguration;
                expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
                expect(ddSdkConfiguration.rumConfiguration?.applicationId).toBe(
                    fakeAppId
                );
                expect(ddSdkConfiguration.env).toBe(fakeEnvName);
                expect(ddSdkConfiguration.proxyConfiguration).toStrictEqual({
                    type: proxyType,
                    address: proxyAddress,
                    port: proxyPort,
                    username: proxyUsername,
                    password: proxyPassword
                });
                expect(
                    ddSdkConfiguration.additionalConfiguration
                ).toStrictEqual({
                    '_dd.react_native_version': reactNativeVersion,
                    '_dd.source': 'react-native',
                    '_dd.sdk_version': sdkVersion
                });
            });
        }
    );
});
