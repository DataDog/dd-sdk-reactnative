/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ProxyConfiguration } from './ProxyConfiguration';
import type { SdkVerbosity } from './SdkVerbosity';
import { TrackingConsent } from './TrackingConsent';
import type { LogEventMapper } from './logs/types';
import type { ActionEventMapper } from './rum/eventMappers/actionEventMapper';
import type { ErrorEventMapper } from './rum/eventMappers/errorEventMapper';
import type { ResourceEventMapper } from './rum/eventMappers/resourceEventMapper';
import type { FirstPartyHost } from './rum/types';
import { PropagatorType } from './rum/types';

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

export type CustomEndpoints = {
    rum?: string;
    logs?: string;
    trace?: string;
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
    sessionSamplingRate: 100.0,
    resourceTracingSamplingRate: 20.0,
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
    getCustomEndpoints: () => ({}),
    bundleLogsWithRum: true,
    bundleLogsWithTraces: true,
    useAccessibilityLabel: true,
    trackWatchdogTerminations: false
};

/**
 * The SDK configuration class.
 * It will be used to configure the SDK functionality at initialization.
 */
export class DdSdkReactNativeConfiguration {
    /**
     * Enables crash reporting for native platforms (iOS, Android). Default `false`.
     */
    public nativeCrashReportEnabled: boolean =
        DEFAULTS.nativeCrashReportEnabled;
    /**
     * @deprecated `sampleRate` has been replaced by `sessionSamplingRate` to avoid confusion with `resourceTracingSamplingRate` and will be removed in a future release.
     */
    public sampleRate?: number;
    /**
     * Percentage of sampled RUM sessions. Range `0`-`100`.
     */
    public sessionSamplingRate: number = DEFAULTS.sessionSamplingRate;
    /**
     * Percentage of tracing integrations for network calls between your app and your backend. Range `0`-`100`.
     */
    public resourceTracingSamplingRate: number =
        DEFAULTS.resourceTracingSamplingRate;
    public site: string = DEFAULTS.site;
    /**
     * Verbosity for internal SDK logging.
     * Set to `SdkVerbosity.DEBUG` to debug your SDK implementation.
     */
    public verbosity: SdkVerbosity | undefined = undefined;
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
    public proxyConfig?: ProxyConfiguration = undefined;
    public serviceName?: string = undefined;
    /**
     * List of your backends hosts to enable tracing with.
     * Regular expressions are NOT supported.
     *
     * Matches domains and subdomains, e.g. `['example.com']` matches `example.com` and `api.example.com`.
     */
    public firstPartyHosts: FirstPartyHostsConfiguration = DEFAULTS.getFirstPartyHosts();
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
     * Sets the preferred frequency for collecting mobile vitals.
     */
    public vitalsUpdateFrequency: VitalsUpdateFrequency =
        DEFAULTS.vitalsUpdateFrequency;

    /**
     * Enables tracking of frustration signals (error taps). Defaults to `true`.
     */
    public trackFrustrations: boolean = DEFAULTS.trackFrustrations;

    /**
     * Sets the preferred frequency for uploading batches of data.
     */
    public uploadFrequency: UploadFrequency = DEFAULTS.uploadFrequency;

    /**
     * Defines the Datadog SDK policy when batching data together before uploading it to Datadog servers.
     * Smaller batches mean smaller but more network requests, whereas larger batches mean fewer but larger network requests.
     */
    public batchSize: BatchSize = DEFAULTS.batchSize;

    /**
     * Enables tracking of RUM event when no RUM View is active.
     *
     * By default, background events are not tracked. Enabling this feature might increase the
     * number of sessions tracked and impact your billing.
     */
    public trackBackgroundEvents: boolean = DEFAULTS.trackBackgroundEvents;

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
     * Enables tracking of non-fatal ANRs on Android.
     * By default, the reporting of non-fatal ANRs on Android 30+ is disabled because it would
     * create too much noise over fatal ANRs. On Android 29 and below, however,
     * the reporting of non-fatal ANRs is enabled by default,
     * as fatal ANRs cannot be reported on those versions.
     */
    public trackNonFatalAnrs?: boolean;

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

    /**
     * Determines whether the SDK should track application termination by the watchdog on iOS. Default: `false`.
     */
    public trackWatchdogTerminations: boolean =
        DEFAULTS.trackWatchdogTerminations;

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

    public logEventMapper: LogEventMapper | null = DEFAULTS.logEventMapper;

    public errorEventMapper: ErrorEventMapper | null =
        DEFAULTS.errorEventMapper;

    public resourceEventMapper: ResourceEventMapper | null =
        DEFAULTS.resourceEventMapper;

    public actionEventMapper: ActionEventMapper | null =
        DEFAULTS.actionEventMapper;

    public additionalConfiguration: {
        [k: string]: any;
    } = DEFAULTS.getAdditionalConfiguration();

    public customEndpoints: CustomEndpoints = DEFAULTS.getCustomEndpoints();

    constructor(
        readonly clientToken: string,
        readonly env: string,
        readonly applicationId: string,
        readonly trackInteractions: boolean = false,
        readonly trackResources: boolean = false,
        readonly trackErrors: boolean = false,
        readonly trackingConsent: TrackingConsent = DEFAULTS.trackingConsent,
        readonly useAccessibilityLabel: boolean = DEFAULTS.useAccessibilityLabel
    ) {}
}

/**
 * Auto Instrumentation configuration passed to DatadogProvider.
 * Does not include default values.
 */
export type AutoInstrumentationConfiguration = {
    readonly trackInteractions: boolean;
    readonly trackResources: boolean;
    readonly firstPartyHosts?: FirstPartyHostsConfiguration;
    readonly resourceTracingSamplingRate?: number;
    readonly trackErrors: boolean;
    readonly logEventMapper?: LogEventMapper | null;
    readonly errorEventMapper?: ErrorEventMapper | null;
    readonly resourceEventMapper?: ResourceEventMapper | null;
    readonly actionEventMapper?: ActionEventMapper | null;
    readonly useAccessibilityLabel?: boolean;
    readonly actionNameAttribute?: string;
};

/**
 * Parameters needed to start auto instrumentation. Includes default values.
 */
export type AutoInstrumentationParameters = {
    readonly trackInteractions: boolean;
    readonly trackResources: boolean;
    readonly firstPartyHosts: FirstPartyHostsConfiguration;
    readonly resourceTracingSamplingRate: number;
    readonly trackErrors: boolean;
    readonly logEventMapper: LogEventMapper | null;
    readonly errorEventMapper: ErrorEventMapper | null;
    readonly resourceEventMapper: ResourceEventMapper | null;
    readonly actionEventMapper: ActionEventMapper | null;
    readonly useAccessibilityLabel: boolean;
    readonly actionNameAttribute?: string;
};

/**
 * We could use `Proxy` instead of this function, but `Proxy` is not available on
 * the older android jsc that can still be used.
 */
export const addDefaultValuesToAutoInstrumentationConfiguration = (
    features: AutoInstrumentationConfiguration
): AutoInstrumentationParameters => {
    return {
        ...features,
        firstPartyHosts:
            features.firstPartyHosts || DEFAULTS.getFirstPartyHosts(),
        resourceTracingSamplingRate:
            features.resourceTracingSamplingRate === undefined
                ? DEFAULTS.resourceTracingSamplingRate
                : features.resourceTracingSamplingRate,
        logEventMapper:
            features.logEventMapper === undefined
                ? DEFAULTS.logEventMapper
                : features.logEventMapper,
        errorEventMapper:
            features.errorEventMapper === undefined
                ? DEFAULTS.errorEventMapper
                : features.errorEventMapper,
        resourceEventMapper:
            features.resourceEventMapper === undefined
                ? DEFAULTS.resourceEventMapper
                : features.resourceEventMapper,
        actionEventMapper:
            features.actionEventMapper === undefined
                ? DEFAULTS.actionEventMapper
                : features.actionEventMapper,
        useAccessibilityLabel: DEFAULTS.useAccessibilityLabel
    };
};

export type PartialInitializationConfiguration = {
    readonly clientToken: string;
    readonly env: string;
    readonly applicationId: string;
    readonly sessionSamplingRate?: number;
    readonly site?: string;
    readonly verbosity?: SdkVerbosity | undefined;
    readonly nativeViewTracking?: boolean;
    readonly nativeInteractionTracking?: boolean;
    readonly proxyConfig?: ProxyConfiguration;
    readonly serviceName?: string;
    readonly version?: string;
    versionSuffix?: string;
    readonly additionalConfiguration?: { [k: string]: any };
    readonly trackingConsent?: TrackingConsent;
    readonly longTaskThresholdMs?: number | false;
    readonly nativeLongTaskThresholdMs?: number | false;
    readonly nativeCrashReportEnabled?: boolean;
    readonly telemetrySampleRate?: number;
    readonly vitalsUpdateFrequency?: VitalsUpdateFrequency;
    readonly trackFrustrations?: boolean;
    readonly uploadFrequency?: UploadFrequency;
    readonly batchSize?: BatchSize;
    readonly trackBackgroundEvents?: boolean;
    readonly customEndpoints?: CustomEndpoints;
    readonly bundleLogsWithRum?: boolean;
    readonly bundleLogsWithTraces?: boolean;
};

const setConfigurationAttribute = <
    AttributeName extends keyof DdSdkReactNativeConfiguration
>(
    attribute: {
        value?: DdSdkReactNativeConfiguration[AttributeName];
        name: AttributeName;
    },
    configuration: DdSdkReactNativeConfiguration
) => {
    if (attribute.value !== undefined) {
        configuration[attribute.name] = attribute.value;
    }
};

export const buildConfigurationFromPartialConfiguration = (
    features: AutoInstrumentationConfiguration,
    configuration: PartialInitializationConfiguration
): DdSdkReactNativeConfiguration => {
    const {
        clientToken,
        env,
        applicationId,
        ...remainingConfiguration
    } = configuration;
    const SdkConfiguration = new DdSdkReactNativeConfiguration(
        clientToken,
        env,
        applicationId,
        features.trackInteractions,
        features.trackResources,
        features.trackErrors,
        configuration.trackingConsent,
        features.useAccessibilityLabel
    );

    (Object.keys(
        remainingConfiguration
    ) as (keyof typeof remainingConfiguration)[]).forEach(name => {
        setConfigurationAttribute(
            { value: remainingConfiguration[name], name },
            SdkConfiguration
        );
    });

    setConfigurationAttribute(
        {
            name: 'resourceTracingSamplingRate',
            value: features.resourceTracingSamplingRate
        },
        SdkConfiguration
    );
    setConfigurationAttribute(
        { name: 'firstPartyHosts', value: features.firstPartyHosts },
        SdkConfiguration
    );
    setConfigurationAttribute(
        {
            name: 'logEventMapper',
            value: features.logEventMapper
        },
        SdkConfiguration
    );
    setConfigurationAttribute(
        {
            name: 'errorEventMapper',
            value: features.errorEventMapper
        },
        SdkConfiguration
    );
    setConfigurationAttribute(
        {
            name: 'resourceEventMapper',
            value: features.resourceEventMapper
        },
        SdkConfiguration
    );
    setConfigurationAttribute(
        {
            name: 'actionEventMapper',
            value: features.actionEventMapper
        },
        SdkConfiguration
    );
    setConfigurationAttribute(
        {
            name: 'actionNameAttribute',
            value: features.actionNameAttribute
        },
        SdkConfiguration
    );

    return SdkConfiguration;
};

export class DatadogProviderConfiguration extends DdSdkReactNativeConfiguration {
    public initializationMode: InitializationMode = InitializationMode.SYNC;
}

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
