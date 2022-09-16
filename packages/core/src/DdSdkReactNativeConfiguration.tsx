/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ProxyConfiguration } from './ProxyConfiguration';
import type { SdkVerbosity } from './SdkVerbosity';
import { TrackingConsent } from './TrackingConsent';

/**
 * The SDK configuration class.
 * It will be used to configure the SDK functionality at initialization.
 */
export class DdSdkReactNativeConfiguration {
    public nativeCrashReportEnabled: boolean = false;
    /**
     * @deprecated `sampleRate` has been replaced by `sessionSamplingRate` to avoid confusion with `resourceTracingSamplingRate` and will be removed in a future release.
     */
    public sampleRate?: number;
    /**
     * Percentage of sampled RUM sessions. Range `0`-`100`.
     */
    public sessionSamplingRate: number = 100.0;
    /**
     * Percentage of tracing integrations for network calls between your app and your backend. Range `0`-`100`.
     */
    public resourceTracingSamplingRate: number = 20.0;
    public site: string = 'US';
    public verbosity: SdkVerbosity | undefined = undefined;
    public nativeViewTracking: boolean = false;
    public proxyConfig?: ProxyConfiguration = undefined;
    public serviceName?: string = undefined;
    public firstPartyHosts: string[] = [];
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
    public telemetrySampleRate?: number;

    public additionalConfig: { [k: string]: any } = {};

    constructor(
        readonly clientToken: string,
        readonly env: string,
        readonly applicationId: string,
        readonly trackInteractions: boolean = false,
        readonly trackResources: boolean = false,
        readonly trackErrors: boolean = false,
        readonly trackingConsent: TrackingConsent = TrackingConsent.GRANTED
    ) {}
}

export type SkipInitializationFeatures = {
    readonly trackInteractions: boolean;
    readonly trackResources: boolean;
    readonly firstPartyHosts?: string[];
    readonly resourceTracingSamplingRate?: number;
    readonly trackErrors: boolean;
};

export type SkipInitializationConfiguration = {
    readonly clientToken: string;
    readonly env: string;
    readonly applicationId: string;
    readonly sessionSamplingRate?: number;
    readonly site?: string;
    readonly verbosity?: SdkVerbosity | undefined;
    readonly nativeViewTracking?: boolean;
    readonly proxyConfig?: ProxyConfiguration;
    readonly serviceName?: string;
    readonly version?: string;
    readonly versionSuffix?: string;
    readonly additionalConfig?: { [k: string]: any };
    readonly trackingConsent?: TrackingConsent;
    readonly nativeCrashReportEnabled?: boolean;
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

export const buildSkipConfiguration = (
    features: SkipInitializationFeatures,
    configuration: SkipInitializationConfiguration
): DdSdkReactNativeConfiguration => {
    const {
        clientToken,
        env,
        applicationId,
        ...remainingConfiguration
    } = configuration;
    const SDKConfiguration = new DdSdkReactNativeConfiguration(
        clientToken,
        env,
        applicationId,
        features.trackInteractions,
        features.trackResources,
        features.trackErrors,
        configuration.trackingConsent
    );

    (Object.keys(
        remainingConfiguration
    ) as (keyof typeof remainingConfiguration)[]).forEach(name => {
        setConfigurationAttribute(
            { value: remainingConfiguration[name], name },
            SDKConfiguration
        );
    });

    setConfigurationAttribute(
        {
            name: 'resourceTracingSamplingRate',
            value: features.resourceTracingSamplingRate
        },
        SDKConfiguration
    );
    setConfigurationAttribute(
        { name: 'firstPartyHosts', value: features.firstPartyHosts },
        SDKConfiguration
    );

    return SDKConfiguration;
};

export class DatadogProviderConfiguration extends DdSdkReactNativeConfiguration {
    public initializationMode: InitializationMode = InitializationMode.SYNC;
}

export enum InitializationMode {
    SYNC = 'SYNC',
    ASYNC = 'ASYNC',
    SKIP = 'SKIP'
}
