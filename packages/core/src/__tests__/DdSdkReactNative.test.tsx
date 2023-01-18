/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { DdSdkReactNativeConfiguration } from '../DdSdkReactNativeConfiguration';
import { DdSdkReactNative } from '../DdSdkReactNative';
import { ProxyType } from '../ProxyConfiguration';
import { SdkVerbosity } from '../SdkVerbosity';
import { TrackingConsent } from '../TrackingConsent';
import { DdSdk } from '../foundation';
import { DdLogs } from '../logs/DdLogs';
import { DdRum } from '../rum/DdRum';
import { DdRumErrorTracking } from '../rum/instrumentation/DdRumErrorTracking';
import { DdRumUserInteractionTracking } from '../rum/instrumentation/interactionTracking/DdRumUserInteractionTracking';
import { DdRumResourceTracking } from '../rum/instrumentation/resourceTracking/DdRumResourceTracking';
import { ErrorSource } from '../rum/types';
import { AttributesSingleton } from '../sdk/AttributesSingleton/AttributesSingleton';
import { UserInfoSingleton } from '../sdk/UserInfoSingleton/UserInfoSingleton';
import type { DdSdkConfiguration } from '../types';
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
    DdSdkReactNative['wasInitialized'] = false;
    DdSdkReactNative['wasAutoInstrumented'] = false;
    NativeModules.DdSdk.initialize.mockClear();
    NativeModules.DdSdk.setAttributes.mockClear();
    NativeModules.DdSdk.setUser.mockClear();
    NativeModules.DdSdk.setTrackingConsent.mockClear();

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
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId
            );

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.applicationId).toBe(fakeAppId);
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.trackingConsent).toBe(
                TrackingConsent.GRANTED
            );
            expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion,
                '_dd.native_view_tracking': false,
                '_dd.first_party_hosts': []
            });
        });

        it('gives rejection when initialize', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId
            );

            NativeModules.DdSdk.initialize.mockRejectedValue('rejection');

            // WHEN
            await expect(
                DdSdkReactNative.initialize(configuration)
            ).rejects.toMatch('rejection');

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.applicationId).toBe(fakeAppId);
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.trackingConsent).toBe(
                TrackingConsent.GRANTED
            );
            expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion,
                '_dd.native_view_tracking': false,
                '_dd.first_party_hosts': []
            });

            expect(DdSdkReactNative['wasInitialized']).toBe(false);
            expect(DdRumUserInteractionTracking.startTracking).toBeCalledTimes(
                0
            );
            expect(DdRumResourceTracking.startTracking).toBeCalledTimes(0);
            expect(DdRumErrorTracking.startTracking).toBeCalledTimes(0);
        });

        it('initializes the SDK when initialize { explicit tracking consent }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const fakeConsent = TrackingConsent.NOT_GRANTED;
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId,
                false,
                false,
                false,
                fakeConsent
            );

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.applicationId).toBe(fakeAppId);
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.trackingConsent).toBe(fakeConsent);
            expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion,
                '_dd.native_view_tracking': false,
                '_dd.first_party_hosts': []
            });
        });

        it('initializes once when initialize { multiple times in a row }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId
            );

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);
            await DdSdkReactNative.initialize(configuration);
            await DdSdkReactNative.initialize(configuration);
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.applicationId).toBe(fakeAppId);
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion,
                '_dd.native_view_tracking': false,
                '_dd.first_party_hosts': []
            });
        });

        it('logs a warning when initialize { with socks proxy config + proxy credentials }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const proxyType = ProxyType.SOCKS;
            const proxyAddress = '1.1.1.1';
            const proxyPort = 8080;
            const proxyUsername = 'foo';
            const proxyPassword = 'bar';

            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId,
                false,
                false,
                false
            );
            configuration.proxyConfig = {
                type: proxyType,
                address: proxyAddress,
                port: proxyPort,
                username: proxyUsername,
                password: proxyPassword
            };

            NativeModules.DdSdk.initialize.mockResolvedValue(null);
            const spyConsoleWarn = jest
                .spyOn(console, 'warn')
                .mockImplementation();

            try {
                // WHEN
                await DdSdkReactNative.initialize(configuration);

                // THEN
                expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(
                    1
                );
                const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                    .calls[0][0] as DdSdkConfiguration;
                expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
                expect(ddSdkConfiguration.applicationId).toBe(fakeAppId);
                expect(ddSdkConfiguration.env).toBe(fakeEnvName);
                expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
                    '_dd.source': 'react-native',
                    '_dd.sdk_version': sdkVersion,
                    '_dd.native_view_tracking': false,
                    '_dd.proxy.type': proxyType,
                    '_dd.proxy.address': proxyAddress,
                    '_dd.proxy.port': proxyPort,
                    '_dd.first_party_hosts': []
                });
                expect(spyConsoleWarn).toHaveBeenCalledTimes(1);
            } finally {
                spyConsoleWarn.mockRestore();
            }
        });

        it('initializes with default sampleRate when not specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId
            );

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledWith(
                expect.objectContaining({
                    sampleRate: 100
                })
            );
        });

        it('initializes with sampleRate when it is specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId
            );
            configuration.sampleRate = 0;

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledWith(
                expect.objectContaining({
                    sampleRate: 0
                })
            );
        });

        it('initializes with sessionSamplingRate when it is specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId
            );
            configuration.sessionSamplingRate = 70;

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledWith(
                expect.objectContaining({
                    sampleRate: 70
                })
            );
        });

        it('initializes with the version when a version is specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId
            );
            configuration.version = '2.0.0';

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkConfiguration;
            expect(ddSdkConfiguration.additionalConfig['_dd.version']).toBe(
                '2.0.0'
            );
        });

        it('initialized with a version suffix when a version suffix is specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId
            );
            configuration.versionSuffix = 'codepush-3';

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkConfiguration;
            expect(
                ddSdkConfiguration.additionalConfig['_dd.version']
            ).toBeUndefined();
            expect(
                ddSdkConfiguration.additionalConfig['_dd.version_suffix']
            ).toBe('-codepush-3');
        });

        it('initializes with the version when a version and version suffix are specified', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId
            );
            configuration.version = '2.0.0';
            configuration.versionSuffix = 'codepush-3';

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkConfiguration;
            expect(ddSdkConfiguration.additionalConfig['_dd.version']).toBe(
                '2.0.0-codepush-3'
            );
            expect(
                ddSdkConfiguration.additionalConfig['_dd.version_suffix']
            ).toBeUndefined();
        });
    });

    describe('feature enablement', () => {
        it('enables user interaction feature when initialize { user interaction config enabled }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId,
                true
            );

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.applicationId).toBe(fakeAppId);
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion,
                '_dd.native_view_tracking': false,
                '_dd.first_party_hosts': []
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
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId,
                false,
                true
            );
            configuration.resourceTracingSamplingRate = 42;
            configuration.firstPartyHosts = ['api.example.com'];

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.applicationId).toBe(fakeAppId);
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion,
                '_dd.native_view_tracking': false,
                '_dd.first_party_hosts': ['api.example.com']
            });
            expect(DdRumResourceTracking.startTracking).toHaveBeenCalledTimes(
                1
            );
            expect(DdRumResourceTracking.startTracking).toHaveBeenCalledWith({
                tracingSamplingRate: 42,
                firstPartyHosts: ['api.example.com']
            });
        });

        it('enables error tracking feature when initialize { error tracking config enabled }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId,
                false,
                false,
                true
            );
            configuration.resourceTracingSamplingRate = 2;

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.applicationId).toBe(fakeAppId);
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion,
                '_dd.native_view_tracking': false,
                '_dd.first_party_hosts': []
            });
            expect(DdRumErrorTracking.startTracking).toHaveBeenCalledTimes(1);
        });

        it('enables logs mapping when initialize { logs mapper enabled }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId,
                false,
                false,
                true
            );
            configuration.logEventMapper = log => {
                log.message = 'new message';
                return log;
            };

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
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId,
                false,
                false,
                true
            );
            configuration.errorEventMapper = event => {
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
                456
            );
        });

        it('enables resource mapping when initialize { resource mapper enabled }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId,
                false,
                false,
                true
            );
            configuration.resourceEventMapper = event => {
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

        it('enables custom service name when initialize { service name }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const fakeServiceName = 'aFakeServiceName';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId,
                false,
                false,
                true
            );
            configuration.serviceName = fakeServiceName;

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.applicationId).toBe(fakeAppId);
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion,
                '_dd.service_name': fakeServiceName,
                '_dd.native_view_tracking': false,
                '_dd.first_party_hosts': []
            });
            expect(DdRumErrorTracking.startTracking).toHaveBeenCalledTimes(1);
        });

        it('enables sdk verbosity when initialize { sdk verbosity }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
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
                .calls[0][0] as DdSdkConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.applicationId).toBe(fakeAppId);
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion,
                '_dd.sdk_verbosity': SdkVerbosity.DEBUG,
                '_dd.native_view_tracking': false,
                '_dd.first_party_hosts': []
            });
            expect(DdRumErrorTracking.startTracking).toHaveBeenCalledTimes(1);
        });

        it('enables native view tracking when initialize { native_view_tracking enabled }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId,
                false,
                false,
                true
            );
            configuration.nativeViewTracking = true;

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkConfiguration;
            expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
            expect(ddSdkConfiguration.applicationId).toBe(fakeAppId);
            expect(ddSdkConfiguration.env).toBe(fakeEnvName);
            expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
                '_dd.source': 'react-native',
                '_dd.sdk_version': sdkVersion,
                '_dd.native_view_tracking': true,
                '_dd.first_party_hosts': []
            });
            expect(DdRumErrorTracking.startTracking).toHaveBeenCalledTimes(1);
        });

        it('enables long task tracking when initialize { native and javascript long task custom threshold }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId,
                false,
                false,
                true
            );
            configuration.nativeLongTaskThresholdMs = 234;
            configuration.longTaskThresholdMs = 456;

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkConfiguration;
            expect(ddSdkConfiguration.nativeLongTaskThresholdMs).toBe(234);
            expect(ddSdkConfiguration.longTaskThresholdMs).toBe(456);
        });

        it('enables long task tracking when initialize { native and javascript long task false threshold }', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId,
                false,
                false,
                true
            );
            configuration.nativeLongTaskThresholdMs = false;
            configuration.longTaskThresholdMs = false;

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            // THEN
            const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock
                .calls[0][0] as DdSdkConfiguration;
            expect(ddSdkConfiguration.nativeLongTaskThresholdMs).toBe(0);
            expect(ddSdkConfiguration.longTaskThresholdMs).toBe(0);
        });
    });

    describe('setAttributes', () => {
        it('calls SDK method when setAttributes', async () => {
            // GIVEN
            const attributes = { foo: 'bar' };

            // WHEN

            await DdSdkReactNative.setAttributes(attributes);

            // THEN
            expect(DdSdk.setAttributes).toHaveBeenCalledTimes(1);
            expect(DdSdk.setAttributes).toHaveBeenCalledWith(attributes);
            expect(AttributesSingleton.getInstance().getAttributes()).toEqual({
                foo: 'bar'
            });
        });
    });

    describe('setUser', () => {
        it('calls SDK method when setUser, and sets the user in UserProvider', async () => {
            // GIVEN
            const user = { id: 'id', foo: 'bar' };

            // WHEN
            await DdSdkReactNative.setUser(user);

            // THEN
            expect(DdSdk.setUser).toHaveBeenCalledTimes(1);
            expect(DdSdk.setUser).toHaveBeenCalledWith(user);
            expect(UserInfoSingleton.getInstance().getUserInfo()).toEqual({
                id: 'id',
                foo: 'bar'
            });
        });
    });

    describe('setTrackingConsent', () => {
        it('calls SDK method when setTrackingConsent', async () => {
            // GIVEN
            const consent = TrackingConsent.PENDING;

            // WHEN

            DdSdkReactNative.setTrackingConsent(consent);

            // THEN
            expect(DdSdk.setTrackingConsent).toHaveBeenCalledTimes(1);
            expect(DdSdk.setTrackingConsent).toHaveBeenCalledWith(consent);
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

                const configuration = new DdSdkReactNativeConfiguration(
                    fakeClientToken,
                    fakeEnvName,
                    fakeAppId,
                    false,
                    false,
                    false
                );

                configuration.proxyConfig = {
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
                    .calls[0][0] as DdSdkConfiguration;
                expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
                expect(ddSdkConfiguration.applicationId).toBe(fakeAppId);
                expect(ddSdkConfiguration.env).toBe(fakeEnvName);
                expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
                    '_dd.source': 'react-native',
                    '_dd.sdk_version': sdkVersion,
                    '_dd.native_view_tracking': false,
                    '_dd.proxy.type': proxyType,
                    '_dd.proxy.address': proxyAddress,
                    '_dd.proxy.port': proxyPort,
                    '_dd.first_party_hosts': []
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

                const configuration = new DdSdkReactNativeConfiguration(
                    fakeClientToken,
                    fakeEnvName,
                    fakeAppId,
                    false,
                    false,
                    false
                );

                configuration.proxyConfig = {
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
                    .calls[0][0] as DdSdkConfiguration;
                expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken);
                expect(ddSdkConfiguration.applicationId).toBe(fakeAppId);
                expect(ddSdkConfiguration.env).toBe(fakeEnvName);
                expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
                    '_dd.source': 'react-native',
                    '_dd.sdk_version': sdkVersion,
                    '_dd.native_view_tracking': false,
                    '_dd.proxy.type': proxyType,
                    '_dd.proxy.address': proxyAddress,
                    '_dd.proxy.port': proxyPort,
                    '_dd.proxy.username': proxyUsername,
                    '_dd.proxy.password': proxyPassword,
                    '_dd.first_party_hosts': []
                });
            });
        }
    );
});
