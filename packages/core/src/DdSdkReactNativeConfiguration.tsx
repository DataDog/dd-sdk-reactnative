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
