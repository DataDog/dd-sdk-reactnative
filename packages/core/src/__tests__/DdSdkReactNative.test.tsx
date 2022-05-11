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
import { DdRumErrorTracking } from '../rum/instrumentation/DdRumErrorTracking';
import { DdRumResourceTracking } from '../rum/instrumentation/DdRumResourceTracking';
import { DdRumUserInteractionTracking } from '../rum/instrumentation/DdRumUserInteractionTracking';
import type { DdSdkConfiguration } from '../types';
import { version as sdkVersion } from '../version';

jest.mock('../InternalLog');

jest.mock('../rum/instrumentation/DdRumUserInteractionTracking', () => {
    return {
        DdRumUserInteractionTracking: {
            startTracking: jest.fn().mockImplementation(() => {})
        }
    };
});

jest.mock('../rum/instrumentation/DdRumResourceTracking', () => {
    return {
        DdRumResourceTracking: {
            startTracking: jest.fn().mockImplementation(() => {})
        }
    };
});

jest.mock('../rum/instrumentation/DdRumErrorTracking', () => {
    return {
        DdRumErrorTracking: {
            startTracking: jest.fn().mockImplementation(() => {})
        }
    };
});

beforeEach(async () => {
    DdSdkReactNative['wasInitialized'] = false;
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
                '_dd.long_task.threshold': 200
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
                '_dd.long_task.threshold': 200
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
                '_dd.long_task.threshold': 200
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
                '_dd.long_task.threshold': 200
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
                    '_dd.long_task.threshold': 200
                });
                expect(spyConsoleWarn).toHaveBeenCalledTimes(1);
            } finally {
                spyConsoleWarn.mockRestore();
            }
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
                '_dd.long_task.threshold': 200
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
                '_dd.long_task.threshold': 200
            });
            expect(DdRumResourceTracking.startTracking).toHaveBeenCalledTimes(
                1
            );
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
                '_dd.long_task.threshold': 200
            });
            expect(DdRumErrorTracking.startTracking).toHaveBeenCalledTimes(1);
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
                '_dd.long_task.threshold': 200
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
                '_dd.long_task.threshold': 200
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
                '_dd.long_task.threshold': 200
            });
            expect(DdRumErrorTracking.startTracking).toHaveBeenCalledTimes(1);
        });
    });

    describe('setAttributes', () => {
        it('calls SDK method when setAttributes', async () => {
            // GIVEN
            const attributes = { foo: 'bar' };

            // WHEN

            DdSdkReactNative.setAttributes(attributes);

            // THEN
            expect(DdSdk.setAttributes).toHaveBeenCalledTimes(1);
            expect(DdSdk.setAttributes).toHaveBeenCalledWith(attributes);
        });
    });

    describe('setUser', () => {
        it('calls SDK method when setUser', async () => {
            // GIVEN
            const user = { foo: 'bar' };

            // WHEN

            DdSdkReactNative.setUser(user);

            // THEN
            expect(DdSdk.setUser).toHaveBeenCalledTimes(1);
            expect(DdSdk.setUser).toHaveBeenCalledWith(user);
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
                    '_dd.long_task.threshold': 200
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
                    '_dd.long_task.threshold': 200
                });
            });
        }
    );
});
