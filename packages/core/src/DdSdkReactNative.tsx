/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { version as reactNativeVersion } from 'react-native/package.json';
import { InteractionManager } from 'react-native';

import { InternalLog } from './InternalLog';
import type { DatadogProviderConfiguration } from './config/DatadogProviderConfiguration';
import { FileBasedConfiguration } from './config/FileBasedConfiguration';
import type {
    AutoInstrumentationConfiguration,
    AutoInstrumentationParameters
} from './config/async/AutoInstrumentationConfiguration';
import { addDefaultValuesToAutoInstrumentationConfiguration } from './config/async/AutoInstrumentationConfiguration';
import type { PartialInitializationConfiguration } from './config/async/PartialInitializationConfiguration';
import { buildConfigurationFromPartialConfiguration } from './config/async/asyncInitializationHelper';
import { DdSdkNativeConfiguration } from './config/features/CoreConfigurationNative';
import { CoreConfiguration } from './config/features/CoreConfiguration';
import type { LogsNativeConfiguration } from './config/features/LogsConfigurationNative';
import type { RumNativeConfiguration } from './config/features/RumConfigurationNative';
import { RUM_DEFAULTS } from './config/features/RumConfiguration';
import type { TraceNativeConfiguration } from './config/features/TraceConfigurationNative';
import type { InitializationModeForTelemetry } from './config/types/InitializationModeForTelemetry';
import { SdkVerbosity } from './config/types/SdkVerbosity';
import type { TrackingConsent } from './config/types/TrackingConsent';
import { InitializationMode } from './config/types';
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
import { NativeDdSdk } from './sdk/DdSdkInternal';
import { GlobalState } from './sdk/GlobalState/GlobalState';
import { UserInfoSingleton } from './sdk/UserInfoSingleton/UserInfoSingleton';
import type { UserInfo } from './sdk/UserInfoSingleton/types';
import { adaptLongTaskThreshold } from './utils/longTasksUtils';
import { version as sdkVersion } from './version';

export type FlagsConfigurationWire = string;

export type NativeFlagsConfiguration = {
    readonly __ddNativeFfeConfiguration: true;
    readonly version: number;
    readonly kind: 'precomputed' | 'rules' | 'mixed';
    readonly etag?: string;
};

export type FlagsEvaluationContext = {
    targetingKey?: string;
    attributes?: Record<string, unknown>;
};

export type FlagsFetchOptions = {
    endpoint: string;
    clientToken?: string;
    sdkKey?: string;
    site?: string;
    headers?: Record<string, string>;
    flagQueryParams?: Record<string, unknown>;
    evaluationContext?: FlagsEvaluationContext;
    previousConfigurationWire?: FlagsConfigurationWire;
};

export type FlagsConfigurationStorageOptions = {
    slot?: string;
    clientName?: string;
};

export type FlagValue =
    | boolean
    | string
    | number
    | Record<string, unknown>
    | null;

export type FlagEvaluationResult<T extends FlagValue = FlagValue> = {
    flagKey: string;
    value: T;
    variant?: string;
    reason: string;
    errorCode?: string;
    flagMetadata?: {
        allocationKey?: string;
        doLog?: boolean;
        extraLogging?: Record<string, unknown>;
        configurationKind?: 'precomputed' | 'rules';
        configurationEtag?: string;
    };
};

export type FlagsProviderDebugState = {
    status: 'not_ready' | 'ready' | 'stale' | 'error';
    activeConfigurationKind?: 'precomputed' | 'rules' | 'mixed';
    activeEtag?: string;
    currentContext?: FlagsEvaluationContext;
    configurationSetCount: number;
    configurationSaveCount: number;
    configurationLoadCount: number;
    fetchCount: number;
    evaluationCount: number;
    lastEvent?: 'provider_ready' | 'configuration_changed' | 'provider_error';
    lastFetchRequest?: {
        url: string;
        method: string;
        headers: Record<string, string>;
        statusCode?: number;
    };
    lastStorage?: {
        operation: 'save' | 'load';
        status: 'stored' | 'failed';
        key?: string;
        updatedAtMs?: number;
        wireBytes?: number;
    };
    lastError?: string;
    evaluationSideEffects?: {
        attemptedCount: number;
        trackedCount: number;
        skippedCount: number;
        failedCount: number;
        lastStatus?: 'tracked' | 'skipped' | 'failed';
        lastError?: string;
    };
};

export type NativeFfeBenchmarkOptions = {
    contexts: FlagsEvaluationContext[];
    flags: Array<{
        key: string;
        variationType: 'BOOLEAN' | 'STRING' | 'INTEGER' | 'NUMERIC' | 'JSON';
        defaultValue: FlagValue;
    }>;
    evaluationTimeMs?: number;
};

export type NativeFfeBenchmarkResult = {
    iterations: number;
    checksum: string;
    evalTotalMs: number;
    perEvalUs: number;
    p50Us: number;
    p95Us: number;
    p99Us: number;
};

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
        configuration: CoreConfiguration
    ): Promise<void> => {
        await DdSdkReactNative.initializeNativeSDK(configuration, {
            initializationModeForTelemetry: 'LEGACY'
        });

        DdSdkReactNative.enableFeatures(configuration);
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
            if (!__DEV__) {
                NativeDdSdk.telemetryDebug(
                    'RN SDK was already initialized in javascript'
                );
            }
            return new Promise(resolve => resolve());
        }

        InternalLog.verbosity = configuration.verbosity;

        registerNativeBridge();

        await NativeDdSdk.initialize(
            DdSdkReactNative.buildConfiguration(configuration, params)
        );

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
            const initNative = () =>
                DdSdkReactNative.initializeNativeSDK(configuration, {
                    initializationModeForTelemetry: 'ASYNC'
                });

            // We rely on requestIdleCallback for RN >= 0.76 to make sure that the SDK initialization
            // happens after rendering has finished
            if ((globalThis as Record<string, unknown>).requestIdleCallback) {
                return new Promise<void>((resolve, reject) => {
                    ((globalThis as unknown) as {
                        requestIdleCallback: (cb: () => void) => void;
                    }).requestIdleCallback(() => {
                        initNative().then(resolve, reject);
                    });
                });
            }

            // On RN below 0.76 we use runAfterInteractions, which initializes the SDK after animations are done
            return InteractionManager.runAfterInteractions(() => {
                return initNative();
            });
        }
        // TODO: Remove when DdSdkReactNativeConfiguration is deprecated
        if (configuration instanceof CoreConfiguration) {
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

        const builtConfiguration = buildConfigurationFromPartialConfiguration(
            DdSdkReactNative.features,
            configuration
        );

        // The XHRProxy was installed at provider mount with the features'
        // default resourceTraceSampleRate; re-apply the resolved value so a
        // resourceTraceSampleRate supplied via DatadogProvider.initialize
        // takes effect on subsequent fetch/XHR calls.
        DdRumResourceTracking.updateTrackingContext({
            resourceTraceSampleRate:
                builtConfiguration.rumConfiguration?.resourceTraceSampleRate ??
                RUM_DEFAULTS.resourceTraceSampleRate
        });

        return DdSdkReactNative.initializeNativeSDK(builtConfiguration, {
            initializationModeForTelemetry: 'PARTIAL'
        });
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
     * Sets the user information. Requires a user ID — setting user properties
     * like name or email implies a known user, so an ID must be provided.
     * To add custom attributes without setting a user ID, use {@link addUserExtraInfo} instead.
     * @param userInfo: The user object (id is required, name, email and extraInfo are optional).
     * @returns a Promise.
     */
    static setUserInfo = async (
        userInfo: UserInfo & { id: string }
    ): Promise<void> => {
        if (typeof userInfo.id !== 'string' || userInfo.id.length === 0) {
            InternalLog.log(
                'setUserInfo requires a valid user ID. Please provide a non-empty string as the id field.',
                SdkVerbosity.WARN
            );
            return;
        }

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

    static configurationFromString = (
        wire: FlagsConfigurationWire
    ): Promise<NativeFlagsConfiguration> => {
        InternalLog.log(
            'Parsing native flags configuration wire',
            SdkVerbosity.DEBUG
        );
        return NativeDdSdk.configurationFromString(
            wire
        ) as Promise<NativeFlagsConfiguration>;
    };

    static configurationToString = (
        configuration: NativeFlagsConfiguration
    ): Promise<FlagsConfigurationWire> => {
        InternalLog.log(
            'Serializing native flags configuration',
            SdkVerbosity.DEBUG
        );
        return NativeDdSdk.configurationToString(configuration);
    };

    static fetchRulesConfiguration = (
        options: FlagsFetchOptions
    ): Promise<NativeFlagsConfiguration> => {
        InternalLog.log(
            'Fetching native rules flags configuration',
            SdkVerbosity.DEBUG
        );
        return NativeDdSdk.fetchRulesConfiguration(
            options
        ) as Promise<NativeFlagsConfiguration>;
    };

    static fetchPrecomputedConfiguration = (
        options: FlagsFetchOptions
    ): Promise<NativeFlagsConfiguration> => {
        InternalLog.log(
            'Fetching native precomputed flags configuration',
            SdkVerbosity.DEBUG
        );
        return NativeDdSdk.fetchPrecomputedConfiguration(
            options
        ) as Promise<NativeFlagsConfiguration>;
    };

    static saveConfiguration = (
        configuration: NativeFlagsConfiguration,
        options: FlagsConfigurationStorageOptions = {}
    ): Promise<FlagsProviderDebugState> => {
        InternalLog.log(
            'Saving native flags configuration',
            SdkVerbosity.DEBUG
        );
        return NativeDdSdk.saveConfiguration(
            configuration,
            options
        ) as Promise<FlagsProviderDebugState>;
    };

    static loadConfiguration = (
        options: FlagsConfigurationStorageOptions = {}
    ): Promise<NativeFlagsConfiguration> => {
        InternalLog.log(
            'Loading native flags configuration',
            SdkVerbosity.DEBUG
        );
        return NativeDdSdk.loadConfiguration(
            options
        ) as Promise<NativeFlagsConfiguration>;
    };

    static setConfiguration = (
        configuration: NativeFlagsConfiguration
    ): Promise<FlagsProviderDebugState> => {
        InternalLog.log(
            'Setting native flags configuration',
            SdkVerbosity.DEBUG
        );
        return NativeDdSdk.setConfiguration(
            configuration
        ) as Promise<FlagsProviderDebugState>;
    };

    static setEvaluationContext = (
        context: FlagsEvaluationContext
    ): Promise<FlagsProviderDebugState> => {
        InternalLog.log(
            'Setting native flags evaluation context',
            SdkVerbosity.DEBUG
        );
        return NativeDdSdk.setEvaluationContext(
            context
        ) as Promise<FlagsProviderDebugState>;
    };

    static resolveBooleanEvaluation = (
        flagKey: string,
        defaultValue: boolean
    ): Promise<FlagEvaluationResult<boolean>> => {
        return NativeDdSdk.resolveBooleanEvaluation(
            flagKey,
            defaultValue
        ) as Promise<FlagEvaluationResult<boolean>>;
    };

    static resolveStringEvaluation = (
        flagKey: string,
        defaultValue: string
    ): Promise<FlagEvaluationResult<string>> => {
        return NativeDdSdk.resolveStringEvaluation(
            flagKey,
            defaultValue
        ) as Promise<FlagEvaluationResult<string>>;
    };

    static resolveNumberEvaluation = (
        flagKey: string,
        defaultValue: number
    ): Promise<FlagEvaluationResult<number>> => {
        return NativeDdSdk.resolveNumberEvaluation(
            flagKey,
            defaultValue
        ) as Promise<FlagEvaluationResult<number>>;
    };

    static resolveObjectEvaluation = <T extends Record<string, unknown>>(
        flagKey: string,
        defaultValue: T
    ): Promise<FlagEvaluationResult<T>> => {
        return NativeDdSdk.resolveObjectEvaluation(
            flagKey,
            defaultValue
        ) as Promise<FlagEvaluationResult<T>>;
    };

    static getProviderDebugState = (): Promise<FlagsProviderDebugState> => {
        return NativeDdSdk.getProviderDebugState() as Promise<FlagsProviderDebugState>;
    };

    static runNativeFfeBenchmark = (
        options: NativeFfeBenchmarkOptions
    ): Promise<NativeFfeBenchmarkResult> => {
        return NativeDdSdk.runNativeFfeBenchmark(
            options
        ) as Promise<NativeFfeBenchmarkResult>;
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

    private static enableFeatures(
        configuration: AutoInstrumentationParameters
    ) {
        const firstPartyHosts =
            configuration.rumConfiguration?.firstPartyHosts ||
            RUM_DEFAULTS.getFirstPartyHosts();
        const trackInteractions =
            configuration.rumConfiguration?.trackInteractions ||
            RUM_DEFAULTS.trackInteractions;
        const trackResources =
            configuration.rumConfiguration?.trackResources ||
            RUM_DEFAULTS.trackResources;
        const trackErrors =
            configuration.rumConfiguration?.trackErrors ||
            RUM_DEFAULTS.trackErrors;
        const actionNameAttribute =
            configuration.rumConfiguration?.actionNameAttribute;
        const resourceTraceSampleRate =
            configuration.rumConfiguration?.resourceTraceSampleRate ||
            RUM_DEFAULTS.resourceTraceSampleRate;
        const logEventMapper = configuration.logsConfiguration?.logEventMapper;
        const errorEventMapper =
            configuration.rumConfiguration?.errorEventMapper;
        const resourceEventMapper =
            configuration.rumConfiguration?.resourceEventMapper;
        const actionEventMapper =
            configuration.rumConfiguration?.actionEventMapper;

        if (globalThis.__DD_RN_BABEL_PLUGIN_ENABLED__) {
            DdBabelInteractionTracking.config = {
                trackInteractions,
                useAccessibilityLabel:
                    configuration.rumConfiguration?.useAccessibilityLabel ||
                    RUM_DEFAULTS.useAccessibilityLabel
            };

            DdBabelInteractionTracking.attachRumInstance(DdRum);
        }

        if (DdSdkReactNative.wasAutoInstrumented) {
            InternalLog.log(
                "Can't auto instrument Datadog, SDK was already instrumented",
                SdkVerbosity.WARN
            );
            return;
        }

        if (trackInteractions && !globalThis.__DD_RN_BABEL_PLUGIN_ENABLED__) {
            DdRumUserInteractionTracking.startTracking({
                actionNameAttribute,
                useAccessibilityLabel:
                    configuration.rumConfiguration?.useAccessibilityLabel
            });
        }

        if (trackResources) {
            DdRumResourceTracking.startTracking({
                resourceTraceSampleRate,
                firstPartyHosts
            });
        }

        if (trackErrors) {
            DdRumErrorTracking.startTracking();
        }

        if (logEventMapper) {
            DdLogs.registerLogEventMapper(logEventMapper);
        }

        if (errorEventMapper) {
            DdRum.registerErrorEventMapper(errorEventMapper);
        }

        if (resourceEventMapper) {
            DdRum.registerResourceEventMapper(resourceEventMapper);
        }

        if (actionEventMapper) {
            DdRum.registerActionEventMapper(actionEventMapper);
        }

        DdSdkReactNative.wasAutoInstrumented = true;
    }
}
