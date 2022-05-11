/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { TrackingConsent } from './TrackingConsent'
import type { SdkVerbosity } from './SdkVerbosity'
import type { ProxyConfiguration } from './ProxyConfiguration';

/**
 * The SDK configuration class.
 * It will be used to configure the SDK functionality at initialization.
 */
export class DdSdkReactNativeConfiguration {

    public nativeCrashReportEnabled: boolean = false;
    public sampleRate: number = 100.0;
    public site: string = "US"
    public verbosity: SdkVerbosity|undefined = undefined
    public nativeViewTracking: boolean = false
    public proxyConfig?: ProxyConfiguration = undefined
    public serviceName?: string = undefined

    public additionalConfig: {[k: string]: any} = {};

    constructor(
        readonly clientToken: string,
        readonly env: string,
        readonly applicationId: string,
        readonly trackInteractions: boolean = false,
        readonly trackResources: boolean = false,
        readonly trackErrors: boolean = false,
        readonly trackingConsent: TrackingConsent = TrackingConsent.GRANTED
    ) {

    }
}
