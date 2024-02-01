/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InteractionManager } from 'react-native';

import {
    DdSdkReactNativeConfiguration,
    buildConfigurationFromPartialConfiguration,
    addDefaultValuesToAutoInstrumentationConfiguration,
    InitializationMode,
    formatFirstPartyHosts
} from './DdSdkReactNativeConfiguration';
import type {
    AutoInstrumentationParameters,
    DatadogProviderConfiguration,
    PartialInitializationConfiguration,
    AutoInstrumentationConfiguration,
    InitializationModeForTelemetry
} from './DdSdkReactNativeConfiguration';
import { InternalLog } from './InternalLog';
import { ProxyType } from './ProxyConfiguration';
import { SdkVerbosity } from './SdkVerbosity';
import type { TrackingConsent } from './TrackingConsent';
import { DdLogs } from './logs/DdLogs';
import { DdRum } from './rum/DdRum';
import { DdRumErrorTracking } from './rum/instrumentation/DdRumErrorTracking';
import { DdRumUserInteractionTracking } from './rum/instrumentation/interactionTracking/DdRumUserInteractionTracking';
import { DdRumResourceTracking } from './rum/instrumentation/resourceTracking/DdRumResourceTracking';
import { AttributesSingleton } from './sdk/AttributesSingleton/AttributesSingleton';
import type { Attributes } from './sdk/AttributesSingleton/types';
import { BufferSingleton } from './sdk/DatadogProvider/Buffer/BufferSingleton';
import { DdSdk } from './sdk/DdSdk';
import { UserInfoSingleton } from './sdk/UserInfoSingleton/UserInfoSingleton';
import type { UserInfo } from './sdk/UserInfoSingleton/types';
import { DdSdkConfiguration } from './types';
import { adaptLongTaskThreshold } from './utils/longTasksUtils';
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
    private static readonly DD_NATIVE_INTERACTION_TRACKING_KEY =
        '_dd.native_interaction_tracking';
    private static readonly DD_VERSION = '_dd.version';
    private static readonly DD_VERSION_SUFFIX = '_dd.version_suffix';
    private static readonly DD_ENABLE_RUM_FOR_LOGS = '_dd.enable_rum_for_logs';
    private static readonly DD_ENABLE_TRACES_FOR_LOGS =
        '_dd.enable_traces_for_logs';

    // Proxy
    private static readonly DD_PROXY_TYPE_KEY = '_dd.proxy.type';
    private static readonly DD_PROXY_ADDRESS_KEY = '_dd.proxy.address';
    private static readonly DD_PROXY_PORT_KEY = '_dd.proxy.port';
    private static readonly DD_PROXY_USERNAME_KEY = '_dd.proxy.username';
    private static readonly DD_PROXY_PASSWORD_KEY = '_dd.proxy.password';

    private static wasInitialized = false;
    private static wasAutoInstrumented = false;
    private static features?: AutoInstrumentationConfiguration;

    /**
     * Initializes the Datadog SDK.
     * @param configuration the configuration for the SDK library
     * @returns a Promise.
     */
    static initialize = async (
        configuration: DdSdkReactNativeConfiguration
    ): Promise<void> => {
        await DdSdkReactNative.initializeNativeSDK(configuration, {
            initializationModeForTelemetry: 'LEGACY'
        });
        DdSdkReactNative.enableFeatures(configuration);
    };

    private static initializeNativeSDK = async (
        configuration: DdSdkReactNativeConfiguration,
        params: {
            initializationModeForTelemetry: InitializationModeForTelemetry;
        }
    ): Promise<void> => {
        if (DdSdkReactNative.wasInitialized) {
            InternalLog.log(
                "Can't initialize Datadog, SDK was already initialized",
                SdkVerbosity.WARN
            );
            if (!__DEV__) {
                DdSdk.telemetryDebug(
                    'RN SDK was already initialized in javascript'
                );
            }
            return new Promise(resolve => resolve());
        }

        InternalLog.verbosity = configuration.verbosity;

        DdSdkReactNative.buildConfiguration(configuration);

        await DdSdk.initialize(
            new DdSdkConfiguration(
                configuration.clientToken,
                configuration.env,
                configuration.applicationId,
                configuration.nativeCrashReportEnabled,
                adaptLongTaskThreshold(configuration.nativeLongTaskThresholdMs),
                adaptLongTaskThreshold(configuration.longTaskThresholdMs),
                configuration.sampleRate === undefined
                    ? configuration.sessionSamplingRate
                    : configuration.sampleRate,
                configuration.site,
                configuration.trackingConsent,
                configuration.additionalConfig,
                configuration.telemetrySampleRate,
                configuration.vitalsUpdateFrequency,
                configuration.uploadFrequency,
                configuration.batchSize,
                configuration.trackFrustrations,
                configuration.trackBackgroundEvents,
                configuration.customEndpoints,
                {
                    initializationType: params.initializationModeForTelemetry,
                    trackErrors: configuration.trackErrors,
                    trackInteractions: configuration.trackInteractions,
                    trackNetworkRequests: configuration.trackResources,
                    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
                    reactNativeVersion: require('react-native/package.json')
                        .version,
                    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
                    reactVersion: require('react/package.json').version
                },
                configuration.enableRumForLogs,
                configuration.enableTracesForLogs
            )
        );
        InternalLog.log('Datadog SDK was initialized', SdkVerbosity.INFO);
        DdSdkReactNative.wasInitialized = true;
        BufferSingleton.onInitialization();
    };

    /**
     * FOR INTERNAL USE ONLY.
     */
    static async _initializeFromDatadogProvider(
        configuration: DatadogProviderConfiguration
    ): Promise<void> {
        DdSdkReactNative.enableFeatures(configuration);
        if (configuration.initializationMode === InitializationMode.SYNC) {
            return DdSdkReactNative.initializeNativeSDK(configuration, {
                initializationModeForTelemetry: 'SYNC'
            });
        }
        if (configuration.initializationMode === InitializationMode.ASYNC) {
            return InteractionManager.runAfterInteractions(() => {
                return DdSdkReactNative.initializeNativeSDK(configuration, {
                    initializationModeForTelemetry: 'ASYNC'
                });
            });
        }
        // TODO: Remove when DdSdkReactNativeConfiguration is deprecated
        if (configuration instanceof DdSdkReactNativeConfiguration) {
            return DdSdkReactNative.initializeNativeSDK(configuration, {
                initializationModeForTelemetry: 'SYNC'
            });
        }
    }

    /**
     * FOR INTERNAL USE ONLY.
     */
    static async _enableFeaturesFromDatadogProvider(
        features: AutoInstrumentationConfiguration
    ): Promise<void> {
        DdSdkReactNative.features = features;
        DdSdkReactNative.enableFeatures(
            addDefaultValuesToAutoInstrumentationConfiguration(features)
        );
    }

    /**
     * FOR INTERNAL USE ONLY.
     */
    static _initializeFromDatadogProviderWithConfigurationAsync = async (
        configuration: PartialInitializationConfiguration
    ): Promise<void> => {
        if (!DdSdkReactNative.features) {
            InternalLog.log(
                "Can't initialize Datadog, make sure the DatadogProvider component is mounted before calling this function",
                SdkVerbosity.WARN
            );
            return new Promise(resolve => resolve());
        }

        return DdSdkReactNative.initializeNativeSDK(
            buildConfigurationFromPartialConfiguration(
                DdSdkReactNative.features,
                configuration
            ),
            { initializationModeForTelemetry: 'PARTIAL' }
        );
    };

    /**
     * Adds a set of attributes to the global context attached with all future Logs, Spans and RUM events.
     * To remove an attribute, set it to `undefined` in a call to `setAttributes`.
     * @param attributes: The global context attributes.
     * @returns a Promise.
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    static setAttributes = async (attributes: Attributes): Promise<void> => {
        InternalLog.log(
            `Setting attributes ${JSON.stringify(attributes)}`,
            SdkVerbosity.DEBUG
        );
        await DdSdk.setAttributes(attributes);
        AttributesSingleton.getInstance().setAttributes(attributes);
    };

    /**
     * Set the user information.
     * @param user: The user object (use builtin attributes: 'id', 'email', 'name', and/or any custom attribute).
     * @returns a Promise.
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    static setUser = async (user: UserInfo): Promise<void> => {
        InternalLog.log(
            `Setting user ${JSON.stringify(user)}`,
            SdkVerbosity.DEBUG
        );
        await DdSdk.setUser(user);
        UserInfoSingleton.getInstance().setUserInfo(user);
    };

    /**
     * Set the tracking consent regarding the data collection.
     * @param trackingConsent: One of TrackingConsent values.
     * @returns a Promise.
     */
    static setTrackingConsent = (consent: TrackingConsent): Promise<void> => {
        InternalLog.log(`Setting consent ${consent}`, SdkVerbosity.DEBUG);
        return DdSdk.setTrackingConsent(consent);
    };

    /**
     * Clears all data that has not already been sent to Datadog servers
     * @returns a Promise
     */
    static clearAllData = (): Promise<void> => {
        InternalLog.log('Clearing all data', SdkVerbosity.DEBUG);
        return DdSdk.clearAllData();
    };

    private static buildConfiguration = (
        configuration: DdSdkReactNativeConfiguration
    ) => {
        configuration.additionalConfig[DdSdkReactNative.DD_SOURCE_KEY] =
            'react-native';
        configuration.additionalConfig[
            DdSdkReactNative.DD_SDK_VERSION
        ] = sdkVersion;
        configuration.additionalConfig[
            DdSdkReactNative.DD_NATIVE_VIEW_TRACKING_KEY
        ] = configuration.nativeViewTracking;
        configuration.additionalConfig[
            DdSdkReactNative.DD_NATIVE_INTERACTION_TRACKING_KEY
        ] = configuration.nativeInteractionTracking;
        configuration.additionalConfig[
            DdSdkReactNative.DD_ENABLE_RUM_FOR_LOGS
        ] = configuration.enableRumForLogs;
        configuration.additionalConfig[
            DdSdkReactNative.DD_ENABLE_TRACES_FOR_LOGS
        ] = configuration.enableTracesForLogs;

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
                    additionalConfig[DdSdkReactNative.DD_PROXY_USERNAME_KEY] =
                        proxyConfig.username;
                    additionalConfig[DdSdkReactNative.DD_PROXY_PASSWORD_KEY] =
                        proxyConfig.password;
                }
            }
        }

        if (configuration.serviceName) {
            configuration.additionalConfig[DdSdkReactNative.DD_SERVICE_NAME] =
                configuration.serviceName;
        }

        if (configuration.version) {
            configuration.additionalConfig[DdSdkReactNative.DD_VERSION] = `${
                configuration.version
            }${
                configuration.versionSuffix
                    ? `-${configuration.versionSuffix}`
                    : ''
            }`;
        }

        // If both version and version suffix are provided, we merge them into the version field.
        // To avoid adding it in again the native part, we only set it if the version isn't set.
        if (configuration.versionSuffix && !configuration.version) {
            configuration.additionalConfig[
                DdSdkReactNative.DD_VERSION_SUFFIX
            ] = `-${configuration.versionSuffix}`;
        }

        configuration.additionalConfig[
            '_dd.first_party_hosts'
        ] = formatFirstPartyHosts(configuration.firstPartyHosts);
    };

    private static enableFeatures(
        configuration: AutoInstrumentationParameters
    ) {
        if (DdSdkReactNative.wasAutoInstrumented) {
            InternalLog.log(
                "Can't auto instrument Datadog, SDK was already instrumented",
                SdkVerbosity.WARN
            );
            return;
        }
        if (configuration.trackInteractions) {
            DdRumUserInteractionTracking.startTracking({
                actionNameAttribute: configuration.actionNameAttribute
            });
        }

        if (configuration.trackResources) {
            DdRumResourceTracking.startTracking({
                tracingSamplingRate: configuration.resourceTracingSamplingRate,
                firstPartyHosts: formatFirstPartyHosts(
                    configuration.firstPartyHosts
                )
            });
        }

        if (configuration.trackErrors) {
            DdRumErrorTracking.startTracking();
        }

        if (configuration.logEventMapper) {
            DdLogs.registerLogEventMapper(configuration.logEventMapper);
        }

        if (configuration.errorEventMapper) {
            DdRum.registerErrorEventMapper(configuration.errorEventMapper);
        }

        if (configuration.resourceEventMapper) {
            DdRum.registerResourceEventMapper(
                configuration.resourceEventMapper
            );
        }

        if (configuration.actionEventMapper) {
            DdRum.registerActionEventMapper(configuration.actionEventMapper);
        }

        DdSdkReactNative.wasAutoInstrumented = true;
    }
}
