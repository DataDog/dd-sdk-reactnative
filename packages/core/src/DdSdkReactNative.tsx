/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { version as reactNativeVersion } from 'react-native/package.json';
import { InteractionManager } from 'react-native';

import type {
    AutoInstrumentationConfiguration,
    AutoInstrumentationParameters,
    DatadogProviderConfiguration,
    InitializationModeForTelemetry,
    PartialInitializationConfiguration
} from './DdSdkReactNativeConfiguration';
import {
    DdSdkReactNativeConfiguration,
    InitializationMode,
    addDefaultValuesToAutoInstrumentationConfiguration,
    buildConfigurationFromPartialConfiguration,
    formatFirstPartyHosts
} from './DdSdkReactNativeConfiguration';
import { InternalLog } from './InternalLog';
import { SdkVerbosity } from './SdkVerbosity';
import type { TrackingConsent } from './TrackingConsent';
import { DdLogs } from './logs/DdLogs';
import { DdRum } from './rum/DdRum';
import { DdRumErrorTracking } from './rum/instrumentation/DdRumErrorTracking';
import { DdBabelInteractionTracking } from './rum/instrumentation/interactionTracking/DdBabelInteractionTracking';
import { DdRumUserInteractionTracking } from './rum/instrumentation/interactionTracking/DdRumUserInteractionTracking';
import { DdRumResourceTracking } from './rum/instrumentation/resourceTracking/DdRumResourceTracking';
import { AccountInfoSingleton } from './sdk/AccountInfoSingleton/AccountInfoSingleton';
import { AttributesSingleton } from './sdk/AttributesSingleton/AttributesSingleton';
import type { Attributes } from './sdk/AttributesSingleton/types';
import { registerNativeBridge } from './sdk/DatadogInternalBridge/DdSdkInternalNativeBridge';
import { BufferSingleton } from './sdk/DatadogProvider/Buffer/BufferSingleton';
import { DdSdk } from './sdk/DdSdk';
import { FileBasedConfiguration } from './sdk/FileBasedConfiguration/FileBasedConfiguration';
import { GlobalState } from './sdk/GlobalState/GlobalState';
import { UserInfoSingleton } from './sdk/UserInfoSingleton/UserInfoSingleton';
import { DdSdkConfiguration } from './types';
import { adaptLongTaskThreshold } from './utils/longTasksUtils';
import { version as sdkVersion } from './version';

/**
 * This class initializes the Datadog SDK, and sets up communication with the server.
 */
export class DdSdkReactNative {
    private static readonly DD_SOURCE_KEY = '_dd.source';
    private static readonly DD_SDK_VERSION = '_dd.sdk_version';
    private static readonly DD_VERSION = '_dd.version';
    private static readonly DD_VERSION_SUFFIX = '_dd.version_suffix';
    private static readonly DD_REACT_NATIVE_VERSION =
        '_dd.react_native_version';

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
        if (GlobalState.instance.isInitialized) {
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

        registerNativeBridge();

        await DdSdk.initialize(
            DdSdkReactNative.buildConfiguration(configuration, params)
        );

        InternalLog.log('Datadog SDK was initialized', SdkVerbosity.INFO);
        GlobalState.instance.isInitialized = true;
        BufferSingleton.onInitialization();
    };

    /**
     * FOR INTERNAL USE ONLY.
     */
    static _initializeFromDatadogProvider = async (
        configuration: DatadogProviderConfiguration
    ): Promise<void> => {
        DdSdkReactNative.enableFeatures(configuration);
        if (configuration instanceof FileBasedConfiguration) {
            return DdSdkReactNative.initializeNativeSDK(configuration, {
                initializationModeForTelemetry: 'FILE'
            });
        }
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
    };

    /**
     * FOR INTERNAL USE ONLY.
     */
    static _enableFeaturesFromDatadogProvider = (
        features: AutoInstrumentationConfiguration
    ): void => {
        DdSdkReactNative._enableFeaturesFromDatadogProviderAsync(features);
    };

    static _enableFeaturesFromDatadogProviderAsync = async (
        features: AutoInstrumentationConfiguration
    ): Promise<void> => {
        DdSdkReactNative.features = features;
        DdSdkReactNative.enableFeatures(
            addDefaultValuesToAutoInstrumentationConfiguration(features)
        );
    };
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
     * Adds a specific attribute to the global context attached with all future Logs, Spans and RUM.
     * @param key: Key that identifies the attribute.
     * @param value: Value linked to the attribute.
     */
    static addAttribute = async (
        key: string,
        value: unknown
    ): Promise<void> => {
        InternalLog.log(
            `Adding attribute ${JSON.stringify(value)} for key ${key}`,
            SdkVerbosity.DEBUG
        );
        await DdSdk.addAttribute(key, { value });
        AttributesSingleton.getInstance().addAttribute(key, value);
    };

    /**
     * Removes an attribute from the context attached with all future Logs, Spans and RUM events.
     * @param key: They key associated with the attribute to be removed.
     */
    static removeAttribute = async (key: string): Promise<void> => {
        InternalLog.log(
            `Removing attribute for key ${key}`,
            SdkVerbosity.DEBUG
        );
        await DdSdk.removeAttribute(key);
        AttributesSingleton.getInstance().removeAttribute(key);
    };

    /**
     * Adds a set of attributes to the global context attached with all future Logs, Spans and RUM events.
     * @param attributes: The global context attributes.
     * @returns a Promise.
     */
    static addAttributes = async (attributes: Attributes): Promise<void> => {
        InternalLog.log(
            `Adding attributes ${JSON.stringify(attributes)}`,
            SdkVerbosity.DEBUG
        );
        await DdSdk.addAttributes(attributes);
        AttributesSingleton.getInstance().addAttributes(attributes);
    };

    /**
     * Removes a set of attributes from the context attached with all future Logs, Spans and RUM events.
     * @param keys: They keys associated with the attributes to be removed.
     */
    static removeAttributes = async (keys: string[]): Promise<void> => {
        InternalLog.log(
            `Removing attributes for keys ${JSON.stringify(keys)}`,
            SdkVerbosity.DEBUG
        );
        await DdSdk.removeAttributes(keys);
        AttributesSingleton.getInstance().removeAttributes(keys);
    };

    /**
     * Sets the user information.
     * @param id: A mandatory unique user identifier (relevant to your business domain).
     * @param name: The user name or alias.
     * @param email: The user email.
     * @param extraInfo: Additional information.
     * @returns a Promise.
     */
    static setUserInfo = async (userInfo: {
        id: string;
        name?: string;
        email?: string;
        extraInfo?: Record<string, unknown>;
    }): Promise<void> => {
        InternalLog.log(
            `Setting user ${JSON.stringify(userInfo)}`,
            SdkVerbosity.DEBUG
        );

        await DdSdk.setUserInfo(userInfo);
        UserInfoSingleton.getInstance().setUserInfo(userInfo);
    };

    /**
     * Clears the user information.
     * @returns a Promise.
     */
    static clearUserInfo = async (): Promise<void> => {
        InternalLog.log('Clearing user info', SdkVerbosity.DEBUG);
        await DdSdk.clearUserInfo();
        UserInfoSingleton.getInstance().clearUserInfo();
    };

    /**
     * Set the user information.
     * @param extraUserInfo: The additional information. (To set the id, name or email please user setUserInfo).
     * @returns a Promise.
     */
    static addUserExtraInfo = async (
        extraUserInfo: Record<string, unknown>
    ): Promise<void> => {
        InternalLog.log(
            `Adding extra user info ${JSON.stringify(extraUserInfo)}`,
            SdkVerbosity.DEBUG
        );

        const userInfo = UserInfoSingleton.getInstance().getUserInfo();
        if (!userInfo) {
            InternalLog.log(
                'Skipped adding User Extra Info: User Info is currently undefined. A user ID must be set before adding extra info. Please call setUserInfo() first.',
                SdkVerbosity.WARN
            );

            return;
        }
        const updatedUserInfo = {
            ...userInfo,
            extraInfo: {
                ...userInfo.extraInfo,
                ...extraUserInfo
            }
        };

        await DdSdk.addUserExtraInfo(extraUserInfo);
        UserInfoSingleton.getInstance().setUserInfo(updatedUserInfo);
    };

    /**
     * Sets the account information.
     * @param id: A mandatory unique account identifier (relevant to your business domain).
     * @param name: The account name.
     * @param extraInfo: Additional information.
     * @returns a Promise.
     */
    static setAccountInfo = async (accountInfo: {
        id: string;
        name?: string;
        extraInfo?: Record<string, unknown>;
    }): Promise<void> => {
        InternalLog.log(
            `Setting account ${JSON.stringify(accountInfo)}`,
            SdkVerbosity.DEBUG
        );

        await DdSdk.setAccountInfo(accountInfo);
        AccountInfoSingleton.getInstance().setAccountInfo(accountInfo);
    };

    /**
     * Clears the account information.
     * @returns a Promise.
     */
    static clearAccountInfo = async (): Promise<void> => {
        InternalLog.log('Clearing account info', SdkVerbosity.DEBUG);
        await DdSdk.clearAccountInfo();
        AccountInfoSingleton.getInstance().clearAccountInfo();
    };

    /**
     * Set the account information.
     * @param extraAccountInfo: The additional information. (To set the id or name please use setAccountInfo).
     * @returns a Promise.
     */
    static addAccountExtraInfo = async (
        extraAccountInfo: Record<string, unknown>
    ): Promise<void> => {
        InternalLog.log(
            `Adding extra account info ${JSON.stringify(extraAccountInfo)}`,
            SdkVerbosity.DEBUG
        );

        const accountInfo = AccountInfoSingleton.getInstance().getAccountInfo();
        if (!accountInfo) {
            InternalLog.log(
                'Skipped adding Account Extra Info: Account Info is currently undefined. An account ID must be set before adding extra info. Please call setAccountInfo() first.',
                SdkVerbosity.WARN
            );

            return;
        }

        const extraInfo = {
            ...accountInfo.extraInfo,
            ...extraAccountInfo
        };

        await DdSdk.addAccountExtraInfo(extraInfo);
        AccountInfoSingleton.getInstance().addAccountExtraInfo(
            extraAccountInfo
        );
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
        configuration: DdSdkReactNativeConfiguration,
        params: {
            initializationModeForTelemetry: InitializationModeForTelemetry;
        }
    ): DdSdkConfiguration => {
        configuration.additionalConfiguration[DdSdkReactNative.DD_SOURCE_KEY] =
            'react-native';
        configuration.additionalConfiguration[
            DdSdkReactNative.DD_SDK_VERSION
        ] = sdkVersion;

        if (configuration.version) {
            configuration.additionalConfiguration[
                DdSdkReactNative.DD_VERSION
            ] = `${configuration.version}${
                configuration.versionSuffix
                    ? `-${configuration.versionSuffix}`
                    : ''
            }`;
        }
        // If both version and version suffix are provided, we merge them into the version field.
        // To avoid adding it in again the native part, we only set it if the version isn't set.
        if (configuration.versionSuffix && !configuration.version) {
            configuration.additionalConfiguration[
                DdSdkReactNative.DD_VERSION_SUFFIX
            ] = `-${configuration.versionSuffix}`;
        }

        if (reactNativeVersion) {
            configuration.additionalConfiguration[
                DdSdkReactNative.DD_REACT_NATIVE_VERSION
            ] = `${reactNativeVersion}`;
        }

        return new DdSdkConfiguration(
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
            configuration.additionalConfiguration,
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
            configuration.nativeViewTracking,
            configuration.nativeInteractionTracking,
            configuration.verbosity,
            configuration.proxyConfig,
            configuration.serviceName,
            formatFirstPartyHosts(configuration.firstPartyHosts),
            configuration.bundleLogsWithRum,
            configuration.bundleLogsWithTraces,
            configuration.trackNonFatalAnrs,
            configuration.appHangThreshold,
            configuration.resourceTracingSamplingRate,
            configuration.trackWatchdogTerminations,
            configuration.batchProcessingLevel,
            configuration.initialResourceThreshold,
            configuration.trackMemoryWarnings
        );
    };

    private static enableFeatures(
        configuration: AutoInstrumentationParameters
    ) {
        if (globalThis.__DD_RN_BABEL_PLUGIN_ENABLED__) {
            DdBabelInteractionTracking.config = {
                trackInteractions: configuration.trackInteractions,
                useAccessibilityLabel: configuration.useAccessibilityLabel
            };

            DdBabelInteractionTracking.getInstance(DdRum);
        }

        if (DdSdkReactNative.wasAutoInstrumented) {
            InternalLog.log(
                "Can't auto instrument Datadog, SDK was already instrumented",
                SdkVerbosity.WARN
            );
            return;
        }

        if (
            configuration.trackInteractions &&
            !globalThis.__DD_RN_BABEL_PLUGIN_ENABLED__
        ) {
            DdRumUserInteractionTracking.startTracking({
                actionNameAttribute: configuration.actionNameAttribute,
                useAccessibilityLabel: configuration.useAccessibilityLabel
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
