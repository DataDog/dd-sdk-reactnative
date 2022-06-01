/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../InternalLog';
import { SdkVerbosity } from '../../../SdkVerbosity';

import { XHRProxy } from './implementation/XHRProxy';
import { firstPartyHostsRegexBuilder } from './implementation/firstPartyHostsRegex';

/**
 * Provides RUM auto-instrumentation feature to track resources (fetch, XHR, axios) as RUM events.
 */
export class DdRumResourceTracking {
    private static isTracking = false;
    private static xhrType: typeof XMLHttpRequest;

    private static originalXhrOpen: any;
    private static originalXhrSend: any;

    /**
     * Starts tracking resources and sends a RUM Resource event every time a network request is detected.
     */
    static startTracking({
        tracingSamplingRate,
        firstPartyHosts
    }: {
        tracingSamplingRate: number;
        firstPartyHosts: string[];
    }): void {
        DdRumResourceTracking.startTrackingInternal(XMLHttpRequest, {
            tracingSamplingRate,
            firstPartyHosts
        });
    }

    /**
     * Starts tracking resources and sends a RUM Resource event every time a fetch or XHR call is detected.
     */
    static startTrackingInternal(
        xhrType: typeof XMLHttpRequest,
        {
            tracingSamplingRate,
            firstPartyHosts
        }: { tracingSamplingRate: number; firstPartyHosts: string[] }
    ): void {
        // extra safety to avoid proxying the XHR class twice
        if (DdRumResourceTracking.isTracking) {
            InternalLog.log(
                'Datadog SDK is already tracking XHR resources',
                SdkVerbosity.WARN
            );
            return;
        }

        DdRumResourceTracking.xhrType = xhrType;
        DdRumResourceTracking.originalXhrOpen = xhrType.prototype.open;
        DdRumResourceTracking.originalXhrSend = xhrType.prototype.send;

        // eslint-disable-next-line no-new
        new XHRProxy(xhrType, {
            originalXhrOpen: DdRumResourceTracking.originalXhrOpen,
            originalXhrSend: DdRumResourceTracking.originalXhrSend,
            tracingSamplingRate,
            firstPartyHostsRegex: firstPartyHostsRegexBuilder(firstPartyHosts)
        });
        InternalLog.log(
            'Datadog SDK is tracking XHR resources',
            SdkVerbosity.INFO
        );
        DdRumResourceTracking.isTracking = true;
    }

    static stopTracking(): void {
        if (DdRumResourceTracking.isTracking) {
            DdRumResourceTracking.isTracking = false;
            DdRumResourceTracking.xhrType.prototype.open =
                DdRumResourceTracking.originalXhrOpen;
            DdRumResourceTracking.xhrType.prototype.send =
                DdRumResourceTracking.originalXhrSend;
        }
    }
}
