/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ProxyConfiguration } from './ProxyConfiguration';
import type { SdkVerbosity } from './SdkVerbosity';
import { TrackingConsent } from './TrackingConsent';
import type { ActionEventMapper } from './rum/eventMappers/actionEventMapper';
import type { ErrorEventMapper } from './rum/eventMappers/errorEventMapper';
import type { ResourceEventMapper } from './rum/eventMappers/resourceEventMapper';
import type { FirstPartyHost } from './rum/types';
import { PropagatorType } from './rum/types';
import type { AttributeEncoder } from './sdk/AttributesEncoding/types';
import type { LogEventMapper } from './types';

export enum VitalsUpdateFrequency {
    FREQUENT = 'FREQUENT',
    AVERAGE = 'AVERAGE',
    RARE = 'RARE',
    NEVER = 'NEVER'
}

export enum UploadFrequency {
    /**
     * Upload data every 1000ms.
     */
    FREQUENT = 'FREQUENT',
    /**
     * Upload data every 5000ms.
     */
    AVERAGE = 'AVERAGE',
    /**
     * Upload data every 10000ms.
     */
    RARE = 'RARE'
}

export enum BatchSize {
    /**
     * Upload less frequent, larger batches of data
     */
    LARGE = 'LARGE',
    /**
     * Use default size for batches of data
     */
    MEDIUM = 'MEDIUM',
    /**
     * Upload more frequent, smaller batches of data
     */
    SMALL = 'SMALL'
}

export enum BatchProcessingLevel {
    /**
     * Only 1 batch will be sent in a single upload cycle.
     */
    LOW = 'LOW',
    /**
     * 10 batches will be sent in a single upload cycle
     */
    MEDIUM = 'MEDIUM',
    /**
     * 100 batches will be sent in a single upload cycle.
     */
    HIGH = 'HIGH'
}

export type FirstPartyHostsConfiguration = (
    | FirstPartyHost
    | LegacyFirstPartyHost
)[];

export type LegacyFirstPartyHost = string;

const isLegacyFirstPartyHost = (
    firstPartyHost: FirstPartyHost | LegacyFirstPartyHost
): firstPartyHost is LegacyFirstPartyHost => {
    return typeof firstPartyHost === 'string';
};

/**
 * Defaults legacy first party hosts format to Datadog first party hosts to keep
 * retro-compatibility before OTel support was introduced.
 */
export const formatFirstPartyHosts = (
    firstPartyHosts: FirstPartyHostsConfiguration
): FirstPartyHost[] => {
    return firstPartyHosts.map(host => {
        if (isLegacyFirstPartyHost(host)) {
            return {
                match: host,
                propagatorTypes: [
                    PropagatorType.DATADOG,
                    PropagatorType.TRACECONTEXT
                ]
            };
        }
        return host;
    });
};

export const DEFAULTS = {
    nativeCrashReportEnabled: false,
    sessionSampleRate: 100.0,
    resourceTraceSampleRate: 100.0,
    site: 'US1',
    longTaskThresholdMs: 0,
    nativeLongTaskThresholdMs: 200,
    nativeViewTracking: false,
    nativeInteractionTracking: false,
    getFirstPartyHosts: () => [],
    getAdditionalConfiguration: () => ({}),
    trackingConsent: TrackingConsent.GRANTED,
    telemetrySampleRate: 20.0,
    vitalsUpdateFrequency: VitalsUpdateFrequency.AVERAGE,
    logEventMapper: null,
    errorEventMapper: null,
    resourceEventMapper: null,
    actionEventMapper: null,
    trackFrustrations: true,
    uploadFrequency: UploadFrequency.AVERAGE,
    batchSize: BatchSize.MEDIUM,
    trackBackgroundEvents: false,
    bundleLogsWithRum: true,
    bundleLogsWithTraces: true,
    useAccessibilityLabel: true,
    trackWatchdogTerminations: false,
    batchProcessingLevel: BatchProcessingLevel.MEDIUM,
    trackMemoryWarnings: true,
    trackInteractions: false,
    trackResources: false,
    trackErrors: false
};

/**
 * The Core configuration class.
 * It will be used to configure the SDK functionality at initialization.
 */
export class CoreConfiguration {
    public additionalConfiguration: {
        [k: string]: any;
    } = DEFAULTS.getAdditionalConfiguration();

    /**
     * Defines the Datadog SDK policy when batching data together before uploading it to Datadog servers.
     * Smaller batches mean smaller but more network requests, whereas larger batches mean fewer but larger network requests.
     */
    public batchSize: BatchSize = DEFAULTS.batchSize;

    /**
     * Sets the preferred level for processing batches of data.
     */
    public batchProcessingLevel: BatchProcessingLevel =
        BatchProcessingLevel.MEDIUM;

    public proxyConfiguration?: ProxyConfiguration = undefined;

    public service?: string = undefined;

    /**
     * Sets the preferred frequency for uploading batches of data.
     */
    public uploadFrequency: UploadFrequency = DEFAULTS.uploadFrequency;

    /**
     * Verbosity for internal SDK logging.
     * Set to `SdkVerbosity.DEBUG` to debug your SDK implementation.
     */
    public verbosity?: SdkVerbosity = undefined;

    /**
     * Overrides the reported version of the app.
     * Accepted characters are alphanumerics and `_`, `-`, `:`, `.`, `/`.
     * Other special characters are converted to underscores.
     *
     * See https://docs.datadoghq.com/getting_started/tagging/#define-tags for more information on the format.
     *
     * Make sure you set it correctly, as it will have to match the one specified during the upload of your source maps and other mapping files.
     */
    public version?: string;

    /**
     * Add a suffix to the reported version of the app.
     * Accepted characters are alphanumerics and `_`, `-`, `:`, `.`, `/`.
     * Other special characters are converted to underscores.
     *
     * See https://docs.datadoghq.com/getting_started/tagging/#define-tags for more information on the format.
     *
     * A dash (`-`) will be automatically added between the version and the suffix
     */
    public versionSuffix?: string;

    public site: string = DEFAULTS.site;

    /**
     * List of your backends hosts to enable tracing with.
     * Regular expressions are NOT supported.
     *
     * Matches domains and subdomains, e.g. `['example.com']` matches `example.com` and `api.example.com`.
     */
    public firstPartyHosts: FirstPartyHostsConfiguration = DEFAULTS.getFirstPartyHosts();

    /**
     * Optional list of custom encoders for attributes.
     *
     * Each encoder defines how to detect (`check`) and transform (`encode`)
     * values of a specific type that is not handled by the built-in encoders
     * (e.g., domain-specific objects, custom classes).
     *
     * These encoders are applied before the built-in ones. If an encoder
     * successfully `check` a value, its `encode` result will be used.
     *
     * Example use cases:
     * - Serializing a custom `UUID` class into a string
     * - Handling third-party library objects that are not JSON-serializable
     */
    public attributeEncoders: AttributeEncoder<any>[] = [];

    public rumConfiguration?: RumConfiguration;

    public logsConfiguration?: LogsConfiguration;

    public traceConfiguration?: TraceConfiguration;

    constructor(
        readonly clientToken: string,
        readonly env: string,
        readonly trackingConsent: TrackingConsent = DEFAULTS.trackingConsent,
        rumConfiguration?: object,
        logsConfiguration?: object,
        traceConfiguration?: object
        // eslint-disable-next-line no-empty-function
    ) {
        this.rumConfiguration = rumConfiguration as RumConfiguration;
        this.logsConfiguration = logsConfiguration as LogsConfiguration;
        this.traceConfiguration = traceConfiguration as TraceConfiguration;
    }
}

export class RumConfiguration {
    public useAccessibilityLabel: boolean = DEFAULTS.useAccessibilityLabel;

    public actionEventMapper: ActionEventMapper | null =
        DEFAULTS.actionEventMapper;

    /**
     * Specifies a custom prop to name RUM actions on elements having an `onPress` prop.
     *
     * For example if you set it to `testID`, the value of the `testID` prop is used as a custom action name:
     *
     * ```js
     * <TouchableOpacity testID="Dismiss notification" onPress={() => dismiss()}>
     * ```
     *
     * `dd-action-name` is favored when both attributes are present on an element.
     */
    public actionNameAttribute?: string;

    /**
     * The app hang threshold in seconds for non-fatal app hangs on iOS.
     *
     * App hangs are an iOS-specific type of error that happens when the application is unresponsive for too long.
     * By default, app hangs reporting is disabled, but you can enable it and set your
     * own threshold to monitor app hangs that last more than a specified
     * duration by using the this parameter.
     *
     * Set the `appHangThreshold` parameter to the minimal duration you want
     * app hangs to be reported. For example, enter 0.25 to report hangs lasting at least 250 ms.
     * See [Configure the app hang threshold](https://docs.datadoghq.com/real_user_monitoring/error_tracking/mobile/ios/?tab=cocoapods#configure-the-app-hang-threshold)
     * for more guidance on what to set this value to.
     */
    public appHangThreshold?: number;

    public errorEventMapper: ErrorEventMapper | null =
        DEFAULTS.errorEventMapper;

    /**
     * The amount of time after a view starts where a Resource should be
     * considered when calculating Time to Network-Settled (TNS). TNS will be
     * calculated using all resources that start withing the specified threshold, in seconds.
     * Defaults to 0.1 seconds.
     */
    public initialResourceThreshold?: number;

    /**
     * The threshold for javascript long tasks reporting in milliseconds.
     *
     * - Setting it to `0` or `false` disables javascript long task reporting.
     * - Values below `100` will be raised to `100`.
     * - Values above `5000` will be lowered to `5000`.
     *
     * Default value is `0`
     */
    public longTaskThresholdMs: number | false = DEFAULTS.longTaskThresholdMs;

    /**
     * Enables tracking of memory warnings as RUM events.
     *
     * When enabled, the SDK will automatically record a RUM event each time the app
     * receives a memory warning from the operating system.
     *
     * **Note:** This setting is only supported on **iOS**. It has no effect on other platforms.
     */
    public trackMemoryWarnings: boolean = DEFAULTS.trackMemoryWarnings;

    /**
     * Enables crash reporting for native platforms (iOS, Android). Default `false`.
     */
    public nativeCrashReportEnabled: boolean =
        DEFAULTS.nativeCrashReportEnabled;

    /**
     * The threshold for native long tasks reporting in milliseconds.
     *
     * - Setting it to `0` or `false` disables native long task reporting.
     * - Values below `100` will be raised to `100`.
     * - Values above `5000` will be lowered to `5000`.
     *
     * Default value is `200`.
     */
    public nativeLongTaskThresholdMs: number | false =
        DEFAULTS.nativeLongTaskThresholdMs;

    /**
     * Enables native views tracking.
     * Set to `true` if you use a custom navigation system relying on native views.
     */
    public nativeViewTracking: boolean = DEFAULTS.nativeViewTracking;

    /**
     * Enables native interaction tracking.
     * Set to `true` if you want to track interactions on native screens.
     */
    public nativeInteractionTracking: boolean =
        DEFAULTS.nativeInteractionTracking;

    public resourceEventMapper: ResourceEventMapper | null =
        DEFAULTS.resourceEventMapper;

    /**
     * Percentage of sampled RUM sessions. Range `0`-`100`.
     * Default is `100`.
     */
    public sessionSampleRate: number = DEFAULTS.sessionSampleRate;

    /**
     * Percentage of tracing integrations for network calls between your app and your backend. Range `0`-`100`.
     * Default is `100`.
     */
    public resourceTraceSampleRate: number = DEFAULTS.resourceTraceSampleRate;

    /**
     * Enables tracking of RUM event when no RUM View is active.
     *
     * By default, background events are not tracked. Enabling this feature might increase the
     * number of sessions tracked and impact your billing.
     */
    public trackBackgroundEvents: boolean = DEFAULTS.trackBackgroundEvents;

    /**
     * Enables tracking of frustration signals (error taps). Defaults to `true`.
     */
    public trackFrustrations: boolean = DEFAULTS.trackFrustrations;

    /**
     * Enables tracking of non-fatal ANRs on Android.
     * By default, the reporting of non-fatal ANRs on Android 30+ is disabled because it would
     * create too much noise over fatal ANRs. On Android 29 and below, however,
     * the reporting of non-fatal ANRs is enabled by default,
     * as fatal ANRs cannot be reported on those versions.
     */
    public trackNonFatalAnrs?: boolean;

    /**
     * Determines whether the SDK should track application termination by the watchdog on iOS. Default: `false`.
     */
    public trackWatchdogTerminations: boolean =
        DEFAULTS.trackWatchdogTerminations;

    /**
     * Sets the preferred frequency for collecting mobile vitals.
     */
    public vitalsUpdateFrequency: VitalsUpdateFrequency =
        DEFAULTS.vitalsUpdateFrequency;

    /**
     * Sets a target custom server for RUM.
     */
    public customEndpoint?: string;

    /**
     * The sampling rate for Internal Telemetry (info related to the work of the
     * SDK internals).
     *
     * The sampling rate must be a value between 0 and 100. A value of 0 means no
     * telemetry will be sent, 100 means all telemetry will be sent. When
     * `telemetrySampleRate` is not set, the default value from the iOS and
     * Android SDK is used, which is 20.
     */
    public telemetrySampleRate: number = DEFAULTS.telemetrySampleRate;

    constructor(
        readonly applicationId: string,
        readonly trackInteractions: boolean = DEFAULTS.trackInteractions,
        readonly trackResources: boolean = DEFAULTS.trackResources,
        readonly trackErrors: boolean = DEFAULTS.trackErrors // eslint-disable-next-line no-empty-function
    ) {}
}
export class LogsConfiguration {
    /**
     * Enables RUM correlation with logs.
     *
     * By default, RUM is enabled for logs.
     */
    public bundleLogsWithRum: boolean = DEFAULTS.bundleLogsWithRum;

    /**
     * Enables Traces correlation with logs.
     *
     * By default, Traces is enabled for logs.
     */
    public bundleLogsWithTraces: boolean = DEFAULTS.bundleLogsWithTraces;

    /**
     * Sets a target custom server for Logs.
     */
    public customEndpoint?: string;

    public logEventMapper: LogEventMapper | null = DEFAULTS.logEventMapper;
}

export class TraceConfiguration {
    /**
     * Sets a target custom server for Traces.
     */
    public customEndpoint?: string;
}

export class DatadogProviderConfiguration extends CoreConfiguration {
    public initializationMode: InitializationMode = InitializationMode.SYNC;
}

/**
 * Auto Instrumentation configuration passed to DatadogProvider.
 * Does not include default values.
 */
export type AutoInstrumentationConfiguration = {
    readonly firstPartyHosts?: FirstPartyHostsConfiguration;
    readonly rumConfiguration: {
        readonly useAccessibilityLabel: boolean;
        readonly trackInteractions: boolean;
        readonly trackResources: boolean;
        readonly trackErrors: boolean;
        readonly actionNameAttribute?: string;
        readonly resourceTraceSampleRate?: number;
        readonly nativeCrashReportEnabled?: boolean;
        readonly nativeLongTaskThresholdMs?: number | false;
        readonly nativeViewTracking?: boolean;
        readonly actionEventMapper?: ActionEventMapper | null;
        readonly errorEventMapper?: ErrorEventMapper | null;
        readonly resourceEventMapper?: ResourceEventMapper | null;
    };
    readonly logsConfiguration: {
        readonly logEventMapper?: LogEventMapper | null;
    };
    readonly traceConfiguration?: TraceConfiguration;
};

/**
 * Parameters needed to start auto instrumentation. Includes default values.
 */
export type AutoInstrumentationParameters = {
    readonly firstPartyHosts: FirstPartyHostsConfiguration;
    readonly rumConfiguration?: {
        readonly useAccessibilityLabel: boolean;
        readonly trackInteractions: boolean;
        readonly trackResources: boolean;
        readonly trackErrors: boolean;
        readonly actionNameAttribute?: string;
        readonly resourceTraceSampleRate: number;
        readonly actionEventMapper: ActionEventMapper | null;
        readonly errorEventMapper: ErrorEventMapper | null;
        readonly resourceEventMapper: ResourceEventMapper | null;
    };
    readonly logsConfiguration?: {
        readonly logEventMapper: LogEventMapper | null;
    };
    readonly traceConfiguration?: TraceConfiguration;
};

/**
 * We could use `Proxy` instead of this function, but `Proxy` is not available on
 * the older android jsc that can still be used.
 */
export const addDefaultValuesToAutoInstrumentationConfiguration = (
    features: AutoInstrumentationConfiguration
): AutoInstrumentationParameters => {
    return {
        firstPartyHosts:
            features.firstPartyHosts || DEFAULTS.getFirstPartyHosts(),
        rumConfiguration: {
            useAccessibilityLabel:
                features.rumConfiguration.useAccessibilityLabel === undefined
                    ? DEFAULTS.useAccessibilityLabel
                    : features.rumConfiguration.useAccessibilityLabel,
            trackInteractions: features.rumConfiguration.trackInteractions,
            trackResources: features.rumConfiguration.trackResources,
            trackErrors: features.rumConfiguration.trackErrors,
            actionNameAttribute: features.rumConfiguration.actionNameAttribute,
            errorEventMapper:
                features.rumConfiguration.errorEventMapper === undefined
                    ? DEFAULTS.errorEventMapper
                    : features.rumConfiguration.errorEventMapper,
            resourceEventMapper:
                features.rumConfiguration.resourceEventMapper === undefined
                    ? DEFAULTS.resourceEventMapper
                    : features.rumConfiguration.resourceEventMapper,
            actionEventMapper:
                features.rumConfiguration.actionEventMapper === undefined
                    ? DEFAULTS.actionEventMapper
                    : features.rumConfiguration.actionEventMapper,
            resourceTraceSampleRate:
                features.rumConfiguration.resourceTraceSampleRate === undefined
                    ? DEFAULTS.resourceTraceSampleRate
                    : features.rumConfiguration.resourceTraceSampleRate
        },
        logsConfiguration: {
            logEventMapper:
                features.logsConfiguration.logEventMapper === undefined
                    ? DEFAULTS.logEventMapper
                    : features.logsConfiguration.logEventMapper
        }
    };
};

export type PartialInitializationConfiguration = {
    readonly additionalConfiguration?: { [k: string]: any };
    readonly attributeEncoders?: AttributeEncoder<any>[];
    readonly clientToken: string;
    readonly env: string;
    readonly site?: string;
    readonly trackingConsent?: TrackingConsent;
    readonly verbosity?: SdkVerbosity | undefined;
    readonly service?: string;
    readonly version?: string;
    versionSuffix?: string;
    readonly proxyConfiguration?: ProxyConfiguration;
    readonly uploadFrequency?: UploadFrequency;
    readonly batchSize?: BatchSize;
    readonly batchProcessingLevel?: BatchProcessingLevel;
    readonly rumConfiguration?: {
        readonly applicationId: string;
        readonly sessionSampleRate?: number;
        readonly nativeLongTaskThresholdMs?: number | false;
        readonly nativeCrashReportEnabled?: boolean;
        readonly nativeViewTracking?: boolean;
        readonly nativeInteractionTracking?: boolean;
        readonly longTaskThresholdMs?: number | false;
        readonly vitalsUpdateFrequency?: VitalsUpdateFrequency;
        readonly trackFrustrations?: boolean;
        readonly trackBackgroundEvents?: boolean;
        readonly initialResourceThreshold?: number;
        readonly trackMemoryWarnings?: boolean;
        readonly telemetrySampleRate?: number;
        readonly customEndpoint?: string;
    };
    readonly logsConfiguration?: {
        readonly bundleLogsWithRum?: boolean;
        readonly bundleLogsWithTraces?: boolean;
        readonly customEndpoint?: string;
    };
    readonly traceConfiguration?: {
        readonly customEndpoint?: string;
    };
};

export const buildConfigurationFromPartialConfiguration = (
    features: AutoInstrumentationConfiguration,
    configuration: PartialInitializationConfiguration
): CoreConfiguration => {
    const { clientToken, env } = configuration;

    const SdkConfiguration = new CoreConfiguration(
        clientToken,
        env,
        configuration.trackingConsent
    );

    if (configuration.additionalConfiguration) {
        SdkConfiguration.additionalConfiguration =
            configuration.additionalConfiguration;
    }

    if (configuration.batchProcessingLevel) {
        SdkConfiguration.batchProcessingLevel =
            configuration.batchProcessingLevel;
    }

    if (configuration.batchSize) {
        SdkConfiguration.batchSize = configuration.batchSize;
    }

    if (configuration.proxyConfiguration) {
        SdkConfiguration.proxyConfiguration = configuration.proxyConfiguration;
    }

    if (configuration.service) {
        SdkConfiguration.service = configuration.service;
    }

    if (configuration.site) {
        SdkConfiguration.site = configuration.site;
    }

    if (configuration.uploadFrequency) {
        SdkConfiguration.uploadFrequency = configuration.uploadFrequency;
    }

    if (configuration.verbosity) {
        SdkConfiguration.verbosity = configuration.verbosity;
    }

    if (configuration.version) {
        SdkConfiguration.version = configuration.version;
    }

    if (configuration.versionSuffix) {
        SdkConfiguration.versionSuffix = configuration.versionSuffix;
    }

    if (features.firstPartyHosts) {
        SdkConfiguration.firstPartyHosts = features.firstPartyHosts;
    }

    if (configuration.attributeEncoders) {
        SdkConfiguration.attributeEncoders = configuration.attributeEncoders;
    }

    if (configuration.rumConfiguration?.applicationId !== undefined) {
        SdkConfiguration.rumConfiguration = new RumConfiguration(
            configuration.rumConfiguration.applicationId,
            features.rumConfiguration.trackInteractions,
            features.rumConfiguration.trackResources,
            features.rumConfiguration.trackErrors
        );
    }

    if (SdkConfiguration.rumConfiguration) {
        if (features.rumConfiguration.useAccessibilityLabel !== undefined) {
            SdkConfiguration.rumConfiguration.useAccessibilityLabel =
                features.rumConfiguration.useAccessibilityLabel;
        }

        if (features.rumConfiguration.errorEventMapper) {
            SdkConfiguration.rumConfiguration.errorEventMapper =
                features.rumConfiguration.errorEventMapper;
        }

        if (features.rumConfiguration.resourceEventMapper) {
            SdkConfiguration.rumConfiguration.resourceEventMapper =
                features.rumConfiguration.resourceEventMapper;
        }

        if (features.rumConfiguration.actionEventMapper) {
            SdkConfiguration.rumConfiguration.actionEventMapper =
                features.rumConfiguration.actionEventMapper;
        }

        if (features.rumConfiguration.actionNameAttribute) {
            SdkConfiguration.rumConfiguration.actionNameAttribute =
                features.rumConfiguration.actionNameAttribute;
        }

        if (configuration.rumConfiguration?.initialResourceThreshold) {
            SdkConfiguration.rumConfiguration.initialResourceThreshold =
                configuration.rumConfiguration?.initialResourceThreshold;
        }

        if (configuration.rumConfiguration?.longTaskThresholdMs) {
            SdkConfiguration.rumConfiguration.longTaskThresholdMs =
                configuration.rumConfiguration?.longTaskThresholdMs;
        }

        if (configuration.rumConfiguration?.nativeCrashReportEnabled) {
            SdkConfiguration.rumConfiguration.nativeCrashReportEnabled =
                configuration.rumConfiguration.nativeCrashReportEnabled;
        }

        if (configuration.rumConfiguration?.nativeLongTaskThresholdMs) {
            SdkConfiguration.rumConfiguration.nativeLongTaskThresholdMs =
                configuration.rumConfiguration.nativeLongTaskThresholdMs;
        }

        if (configuration.rumConfiguration?.nativeInteractionTracking) {
            SdkConfiguration.rumConfiguration.nativeInteractionTracking =
                configuration.rumConfiguration?.nativeInteractionTracking;
        }

        if (configuration.rumConfiguration?.nativeViewTracking) {
            SdkConfiguration.rumConfiguration.nativeViewTracking =
                configuration.rumConfiguration?.nativeViewTracking;
        }

        if (configuration.rumConfiguration?.sessionSampleRate) {
            SdkConfiguration.rumConfiguration.sessionSampleRate =
                configuration.rumConfiguration?.sessionSampleRate;
        }

        if (features.rumConfiguration?.resourceTraceSampleRate !== undefined) {
            SdkConfiguration.rumConfiguration.resourceTraceSampleRate =
                features.rumConfiguration.resourceTraceSampleRate;
        }

        if (configuration.rumConfiguration?.telemetrySampleRate) {
            SdkConfiguration.rumConfiguration.telemetrySampleRate =
                configuration.rumConfiguration?.telemetrySampleRate;
        }

        if (configuration.rumConfiguration?.trackBackgroundEvents) {
            SdkConfiguration.rumConfiguration.trackBackgroundEvents =
                configuration.rumConfiguration?.trackBackgroundEvents;
        }

        if (configuration.rumConfiguration?.trackFrustrations) {
            SdkConfiguration.rumConfiguration.trackFrustrations =
                configuration.rumConfiguration?.trackFrustrations;
        }

        if (configuration.rumConfiguration?.trackMemoryWarnings) {
            SdkConfiguration.rumConfiguration.trackMemoryWarnings =
                configuration.rumConfiguration?.trackMemoryWarnings;
        }

        if (configuration.rumConfiguration?.vitalsUpdateFrequency) {
            SdkConfiguration.rumConfiguration.vitalsUpdateFrequency =
                configuration.rumConfiguration?.vitalsUpdateFrequency;
        }

        if (configuration.rumConfiguration?.customEndpoint) {
            SdkConfiguration.rumConfiguration.customEndpoint =
                configuration.rumConfiguration?.customEndpoint;
        }
    }

    if (features.traceConfiguration !== undefined) {
        SdkConfiguration.traceConfiguration = new TraceConfiguration();

        if (configuration.traceConfiguration?.customEndpoint) {
            SdkConfiguration.traceConfiguration.customEndpoint =
                configuration.traceConfiguration?.customEndpoint;
        }
    }

    if (features.logsConfiguration !== undefined) {
        SdkConfiguration.logsConfiguration = new LogsConfiguration();

        if (features.logsConfiguration.logEventMapper) {
            SdkConfiguration.logsConfiguration.logEventMapper =
                features.logsConfiguration.logEventMapper;
        }

        if (configuration.logsConfiguration?.bundleLogsWithRum) {
            SdkConfiguration.logsConfiguration.bundleLogsWithRum =
                configuration.logsConfiguration?.bundleLogsWithRum;
        }

        if (configuration.logsConfiguration?.bundleLogsWithTraces) {
            SdkConfiguration.logsConfiguration.bundleLogsWithTraces =
                configuration.logsConfiguration?.bundleLogsWithTraces;
        }

        if (configuration.logsConfiguration?.customEndpoint) {
            SdkConfiguration.logsConfiguration.customEndpoint =
                configuration.traceConfiguration?.customEndpoint;
        }
    }

    return SdkConfiguration;
};

export enum InitializationMode {
    SYNC = 'SYNC',
    ASYNC = 'ASYNC'
}

export type InitializationModeForTelemetry =
    | 'LEGACY'
    | 'SYNC'
    | 'ASYNC'
    | 'PARTIAL'
    | 'FILE';
