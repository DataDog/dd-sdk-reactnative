/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { DdSdkReactNativeConfiguration } from './DdSdkReactNativeConfiguration';
import { InternalLog } from './InternalLog';
import { ProxyType } from './ProxyConfiguration';
import { SdkVerbosity } from './SdkVerbosity';
import type { TrackingConsent } from './TrackingConsent';
import { DdSdk } from './foundation';
import { DdRumErrorTracking } from './rum/instrumentation/DdRumErrorTracking';
import { DdRumResourceTracking } from './rum/instrumentation/DdRumResourceTracking';
import { DdRumUserInteractionTracking } from './rum/instrumentation/DdRumUserInteractionTracking';
import { DdSdkConfiguration } from './types';
import { version as sdkVersion } from './version';

/**
 * This class initializes the Datadog SDK, and sets up communication with the server.
 */
export class DdSdkReactNative {
    private static readonly DD_SOURCE_KEY = '_dd.source';
    private static readonly DD_SDK_VERSION = '_dd.sdk_version';
    private static readonly DD_SERVICE_NAME = '_dd.service_name';
    private static readonly DD_SDK_VERBOSITY_KEY = '_dd.sdk_verbosity';
    private static readonly DD_NATIVE_VIEW_TRACKING_KEY =
        '_dd.native_view_tracking';

    // Proxy
    private static readonly DD_PROXY_TYPE_KEY = '_dd.proxy.type';
    private static readonly DD_PROXY_ADDRESS_KEY = '_dd.proxy.address';
    private static readonly DD_PROXY_PORT_KEY = '_dd.proxy.port';
    private static readonly DD_PROXY_USERNAME_KEY = '_dd.proxy.username';
    private static readonly DD_PROXY_PASSWORD_KEY = '_dd.proxy.password';

    private static readonly DD_NATIVE_LONG_TASK_THRESHOLD_KEY =
        '_dd.long_task.threshold';
    private static readonly NATIVE_LONG_TASK_THRESHOLD_MS = 200;

    private static wasInitialized = false;

    /**
     * Initializes the Datadog SDK.
     * @param configuration the configuration for the SDK library
     * @returns a Promise.
     */
    static initialize(
        configuration: DdSdkReactNativeConfiguration
    ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (DdSdkReactNative.wasInitialized) {
                InternalLog.log(
                    "Can't initialize Datadog, SDK was already initialized",
                    SdkVerbosity.WARN
                );
                resolve();
                return;
            }

            InternalLog.verbosity = configuration.verbosity;

            configuration.additionalConfig[DdSdkReactNative.DD_SOURCE_KEY] =
                'react-native';
            configuration.additionalConfig[
                DdSdkReactNative.DD_SDK_VERSION
            ] = sdkVersion;
            configuration.additionalConfig[
                DdSdkReactNative.DD_NATIVE_VIEW_TRACKING_KEY
            ] = configuration.nativeViewTracking;
            if (configuration.verbosity) {
                configuration.additionalConfig[
                    DdSdkReactNative.DD_SDK_VERBOSITY_KEY
                ] = configuration.verbosity;
            }

            if (configuration.proxyConfig) {
                const additionalConfig = configuration.additionalConfig;
                const proxyConfig = configuration.proxyConfig;

                additionalConfig[DdSdkReactNative.DD_PROXY_TYPE_KEY] =
                    proxyConfig.type;
                additionalConfig[DdSdkReactNative.DD_PROXY_ADDRESS_KEY] =
                    proxyConfig.address;
                additionalConfig[DdSdkReactNative.DD_PROXY_PORT_KEY] =
                    proxyConfig.port;
                if (proxyConfig.username && proxyConfig.password) {
                    if (proxyConfig.type === ProxyType.SOCKS) {
                        console.warn(
                            "SOCKS proxy configuration doesn't support Basic authentication."
                        );
                    } else {
                        additionalConfig[
                            DdSdkReactNative.DD_PROXY_USERNAME_KEY
                        ] = proxyConfig.username;
                        additionalConfig[
                            DdSdkReactNative.DD_PROXY_PASSWORD_KEY
                        ] = proxyConfig.password;
                    }
                }
            }

            if (configuration.serviceName) {
                configuration.additionalConfig[
                    DdSdkReactNative.DD_SERVICE_NAME
                ] = configuration.serviceName;
            }

            configuration.additionalConfig[
                DdSdkReactNative.DD_NATIVE_LONG_TASK_THRESHOLD_KEY
            ] = DdSdkReactNative.NATIVE_LONG_TASK_THRESHOLD_MS;

            DdSdk.initialize(
                new DdSdkConfiguration(
                    configuration.clientToken,
                    configuration.env,
                    configuration.applicationId,
                    configuration.nativeCrashReportEnabled,
                    configuration.sampleRate === undefined
                        ? configuration.sessionSamplingRate
                        : configuration.sampleRate,
                    configuration.site,
                    configuration.trackingConsent,
                    configuration.additionalConfig
                )
            ).then(
                () => {
                    InternalLog.log(
                        'Datadog SDK was initialized',
                        SdkVerbosity.INFO
                    );
                    DdSdkReactNative.enableFeatures(configuration);
                    DdSdkReactNative.wasInitialized = true;
                    resolve();
                },
                rejection => {
                    reject(rejection);
                }
            );
        });
    }

    /**
     * Sets the global context (set of attributes) attached with all future Logs, Spans and RUM events.
     * @param attributes: The global context attributes.
     * @returns a Promise.
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    static setAttributes(attributes: object): Promise<void> {
        InternalLog.log(
            `Setting attributes ${JSON.stringify(attributes)}`,
            SdkVerbosity.DEBUG
        );
        return DdSdk.setAttributes(attributes);
    }

    /**
     * Set the user information.
     * @param user: The user object (use builtin attributes: 'id', 'email', 'name', and/or any custom attribute).
     * @returns a Promise.
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    static setUser(user: object): Promise<void> {
        InternalLog.log(
            `Setting user ${JSON.stringify(user)}`,
            SdkVerbosity.DEBUG
        );
        return DdSdk.setUser(user);
    }

    /**
     * Set the tracking consent regarding the data collection.
     * @param trackingConsent: One of TrackingConsent values.
     * @returns a Promise.
     */
    static setTrackingConsent(consent: TrackingConsent): Promise<void> {
        InternalLog.log(`Setting consent ${consent}`, SdkVerbosity.DEBUG);
        return DdSdk.setTrackingConsent(consent);
    }

    private static enableFeatures(
        configuration: DdSdkReactNativeConfiguration
    ) {
        if (configuration.trackInteractions) {
            DdRumUserInteractionTracking.startTracking();
        }

        if (configuration.trackResources) {
            DdRumResourceTracking.startTracking();
        }

        if (configuration.trackErrors) {
            DdRumErrorTracking.startTracking();
        }
    }
}
