/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    addDefaultValuesToAutoInstrumentationConfiguration,
    buildConfigurationFromPartialConfiguration,
    DdSdkNativeConfiguration,
    RUM_DEFAULTS,
    adaptLongTaskThreshold,
    version as sdkVersion,
    AccountInfoSingleton,
    AttributesSingleton,
    BufferSingleton,
    GlobalState,
    UserInfoSingleton,
    DdRumResourceTracking
} from '@datadog/mobile-react-native/internal';
import type {
    Attributes,
    LogsNativeConfiguration,
    RumNativeConfiguration,
    TraceNativeConfiguration,
    InitializationModeForTelemetry
} from '@datadog/mobile-react-native/internal';
import {
    InternalLog,
    FileBasedConfiguration,
    CoreConfiguration,
    SdkVerbosity,
    InitializationMode,
    DdBabelInteractionTracking,
    // Importing DdRum as a value guarantees the core barrel evaluates DdRum.ts
    // and registers the core RUM singleton before patchCoreRumSingleton() runs.
    // Without this, a tree-shaking bundler may skip DdRum.ts and leave the
    // singleton unregistered, causing patchCoreRumSingleton() to silently no-op.
    DdRum as CoreDdRum
} from '@datadog/mobile-react-native';
import type {
    DatadogProviderConfiguration,
    AutoInstrumentationConfiguration,
    PartialInitializationConfiguration,
    TrackingConsent
} from '@datadog/mobile-react-native';
import { version as reactNativeVersion } from 'react-native/package.json';
import { InteractionManager } from 'react-native';

import { DdRum as VegaDdRum } from './DdRumVega';
import { startHttpProxy } from './HttpProxy';
import { patchCoreRumResourceTracking } from './InternalResourceTracking';
import NativeDdRum from './turbo-modules/NativeDdRum';
import NativeDdSdk from './turbo-modules/NativeDdSdk';

/**
 * Vega-specific SDK initialization class.
 *
 * This replaces core's DdSdkReactNative for Vega OS. It uses Kepler
 * TurboModules instead of React Native's TurboModuleRegistry.
 */
export class DdSdkReactNativeVega {
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
        configuration: CoreConfiguration
    ): Promise<void> => {
        await DdSdkReactNativeVega.initializeNativeSDK(configuration, {
            initializationModeForTelemetry: 'LEGACY'
        });

        DdSdkReactNativeVega.enableFeatures(configuration);
    };

    private static initializeNativeSDK = async (
        configuration: CoreConfiguration,
        params: {
            initializationModeForTelemetry: InitializationModeForTelemetry;
        }
    ): Promise<void> => {
        if (GlobalState.isInitialized) {
            InternalLog.log(
                "Can't initialize Datadog, SDK was already initialized",
                SdkVerbosity.WARN
            );
            return new Promise(resolve => resolve());
        }

        InternalLog.verbosity = configuration.verbosity;

        // Note: registerNativeBridge() is not applicable on Vega

        const nativeConfig = DdSdkReactNativeVega.buildConfiguration(
            configuration,
            params
        );
        await NativeDdSdk.initialize(nativeConfig);

        // Start the HTTP proxy so dd-sdk-cpp can upload data through JS fetch()
        startHttpProxy();

        InternalLog.log('Datadog SDK was initialized', SdkVerbosity.INFO);
        GlobalState.isInitialized = true;
        BufferSingleton.onInitialization();
    };

    /**
     * FOR INTERNAL USE ONLY.
     */
    static _initializeFromDatadogProvider = async (
        configuration: DatadogProviderConfiguration
    ): Promise<void> => {
        DdSdkReactNativeVega.enableFeatures(configuration);
        if (configuration instanceof FileBasedConfiguration) {
            return DdSdkReactNativeVega.initializeNativeSDK(configuration, {
                initializationModeForTelemetry: 'FILE'
            });
        }
        if (configuration.initializationMode === InitializationMode.SYNC) {
            return DdSdkReactNativeVega.initializeNativeSDK(configuration, {
                initializationModeForTelemetry: 'SYNC'
            });
        }
        if (configuration.initializationMode === InitializationMode.ASYNC) {
            return InteractionManager.runAfterInteractions(() => {
                return DdSdkReactNativeVega.initializeNativeSDK(configuration, {
                    initializationModeForTelemetry: 'ASYNC'
                });
            });
        }
        // TODO: Remove when DdSdkReactNativeConfiguration is deprecated
        if (configuration instanceof CoreConfiguration) {
            return DdSdkReactNativeVega.initializeNativeSDK(configuration, {
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
        DdSdkReactNativeVega._enableFeaturesFromDatadogProviderAsync(features);
    };

    static _enableFeaturesFromDatadogProviderAsync = async (
        features: AutoInstrumentationConfiguration
    ): Promise<void> => {
        DdSdkReactNativeVega.features = features;
        DdSdkReactNativeVega.enableFeatures(
            addDefaultValuesToAutoInstrumentationConfiguration(features)
        );
    };

    /**
     * FOR INTERNAL USE ONLY.
     */
    static _initializeFromDatadogProviderWithConfigurationAsync = async (
        configuration: PartialInitializationConfiguration
    ): Promise<void> => {
        if (!DdSdkReactNativeVega.features) {
            InternalLog.log(
                "Can't initialize Datadog, make sure the DatadogProvider component is mounted before calling this function",
                SdkVerbosity.WARN
            );
            return new Promise(resolve => resolve());
        }

        return DdSdkReactNativeVega.initializeNativeSDK(
            buildConfigurationFromPartialConfiguration(
                DdSdkReactNativeVega.features,
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
        await NativeDdSdk.addAttribute(key, { value });
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
        await NativeDdSdk.removeAttribute(key);
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
        await NativeDdSdk.addAttributes(attributes);
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
        await NativeDdSdk.removeAttributes(keys);
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

        await NativeDdSdk.setUserInfo(userInfo);
        UserInfoSingleton.getInstance().setUserInfo(userInfo);
    };

    /**
     * Clears the user information.
     * @returns a Promise.
     */
    static clearUserInfo = async (): Promise<void> => {
        InternalLog.log('Clearing user info', SdkVerbosity.DEBUG);
        await NativeDdSdk.clearUserInfo();
        UserInfoSingleton.getInstance().clearUserInfo();
    };

    /**
     * Set the user information.
     * @param extraUserInfo: The additional information. (To set the id, name or email please use setUserInfo).
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
        await NativeDdSdk.addUserExtraInfo(extraUserInfo);
        UserInfoSingleton.getInstance().addUserExtraInfo(extraUserInfo);
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

        await NativeDdSdk.setAccountInfo(accountInfo);
        AccountInfoSingleton.getInstance().setAccountInfo(accountInfo);
    };

    /**
     * Clears the account information.
     * @returns a Promise.
     */
    static clearAccountInfo = async (): Promise<void> => {
        InternalLog.log('Clearing account info', SdkVerbosity.DEBUG);
        await NativeDdSdk.clearAccountInfo();
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

        await NativeDdSdk.addAccountExtraInfo(extraInfo);
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
        return NativeDdSdk.setTrackingConsent(consent);
    };

    /**
     * Clears all data that has not already been sent to Datadog servers
     * @returns a Promise
     */
    static clearAllData = (): Promise<void> => {
        InternalLog.log('Clearing all data', SdkVerbosity.DEBUG);
        return NativeDdSdk.clearAllData();
    };

    private static buildConfiguration = (
        configuration: CoreConfiguration,
        params: {
            initializationModeForTelemetry: InitializationModeForTelemetry;
        }
    ): DdSdkNativeConfiguration => {
        if (configuration.additionalConfiguration === undefined) {
            configuration.additionalConfiguration = {};
        }
        configuration.additionalConfiguration[
            DdSdkReactNativeVega.DD_SOURCE_KEY
        ] = 'react-native';
        configuration.additionalConfiguration[
            DdSdkReactNativeVega.DD_SDK_VERSION
        ] = sdkVersion;

        if (configuration.version) {
            configuration.additionalConfiguration[
                DdSdkReactNativeVega.DD_VERSION
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
                DdSdkReactNativeVega.DD_VERSION_SUFFIX
            ] = `-${configuration.versionSuffix}`;
        }

        if (reactNativeVersion) {
            configuration.additionalConfiguration[
                DdSdkReactNativeVega.DD_REACT_NATIVE_VERSION
            ] = `${reactNativeVersion}`;
        }

        const rumConfiguration = configuration.rumConfiguration;
        if (rumConfiguration) {
            const longTaskThresholdMs =
                rumConfiguration.longTaskThresholdMs ||
                RUM_DEFAULTS.longTaskThresholdMs;
            rumConfiguration.longTaskThresholdMs = adaptLongTaskThreshold(
                longTaskThresholdMs
            );

            const nativeLongTaskThresholdMs =
                configuration.rumConfiguration?.nativeLongTaskThresholdMs ??
                RUM_DEFAULTS.nativeLongTaskThresholdMs;
            rumConfiguration.nativeLongTaskThresholdMs = adaptLongTaskThreshold(
                nativeLongTaskThresholdMs
            );
        }

        const trackInteractions =
            configuration.rumConfiguration?.trackInteractions ||
            RUM_DEFAULTS.trackInteractions;
        const trackResources =
            configuration.rumConfiguration?.trackResources ||
            RUM_DEFAULTS.trackResources;
        const trackErrors =
            configuration.rumConfiguration?.trackErrors ||
            RUM_DEFAULTS.trackErrors;

        return new DdSdkNativeConfiguration(
            configuration.additionalConfiguration,
            configuration.clientToken,
            configuration.env,
            configuration.site,
            configuration.service,
            configuration.verbosity,
            configuration.trackingConsent,
            configuration.uploadFrequency,
            configuration.batchSize,
            configuration.batchProcessingLevel,
            configuration.proxyConfiguration,
            configuration.attributeEncoders,
            rumConfiguration as RumNativeConfiguration,
            configuration.logsConfiguration as LogsNativeConfiguration,
            configuration.traceConfiguration as TraceNativeConfiguration,
            {
                initializationType: params.initializationModeForTelemetry,
                trackErrors,
                trackInteractions,
                trackNetworkRequests: trackResources,
                // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
                reactNativeVersion: require('react-native/package.json')
                    .version,
                // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
                reactVersion: require('react/package.json').version
            }
        );
    };

    private static enableFeatures(configuration: object) {
        if (DdSdkReactNativeVega.wasAutoInstrumented) {
            InternalLog.log(
                "Can't auto instrument Datadog, SDK was already instrumented",
                SdkVerbosity.WARN
            );
            return;
        }

        const rumConfig = (configuration as any)?.rumConfiguration;
        const trackInteractions = rumConfig?.trackInteractions ?? true;
        const trackResources = rumConfig?.trackResources ?? true;

        // Patch core's DdRum singleton to route native calls through Vega's
        // Kepler module. Core's singleton is created with nativeRum = null on
        // Vega (RN's TurboModuleRegistry returns null). By patching it before
        // enabling features, all core instrumentation (resource tracking, event
        // mappers, buffering) works transparently with Vega's native module.
        DdSdkReactNativeVega.patchCoreRumSingleton();

        // Wire up babel plugin interaction tracking if the plugin is enabled
        if (globalThis.__DD_RN_BABEL_PLUGIN_ENABLED__) {
            DdBabelInteractionTracking.config = {
                trackInteractions,
                useAccessibilityLabel: rumConfig?.useAccessibilityLabel ?? true
            };
            DdBabelInteractionTracking.attachRumInstance(
                (VegaDdRum as unknown) as typeof CoreDdRum
            );
        }

        // Enable automatic resource/network request tracking
        if (trackResources) {
            const resourceTraceSampleRate =
                rumConfig?.resourceTraceSampleRate ?? 20;
            const firstPartyHosts = rumConfig?.firstPartyHosts ?? [];

            DdRumResourceTracking.startTracking({
                resourceTraceSampleRate,
                firstPartyHosts
            });
        }

        DdSdkReactNativeVega.wasAutoInstrumented = true;
    }

    /**
     * Patches core's DdRum global singleton so its underlying native module
     * points to Vega's Kepler TurboModule instead of RN's (which is null).
     *
     * CoreDdRum is the singleton created by getGlobalInstance() when DdRum.ts
     * is evaluated. Importing it above guarantees the module is evaluated before
     * this method runs, so the singleton is always registered.
     */
    private static patchCoreRumSingleton() {
        // CoreDdRum IS the singleton (getGlobalInstance returns the same object
        // stored in globalThis). Cast to any to access the private nativeRum field.
        const rumSingleton = CoreDdRum as any;
        if (rumSingleton) {
            rumSingleton.nativeRum = NativeDdRum;
            patchCoreRumResourceTracking(rumSingleton);
        }
    }
}
