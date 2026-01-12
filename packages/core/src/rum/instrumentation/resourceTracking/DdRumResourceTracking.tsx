/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import BigInt from 'big-integer';

import { InternalLog } from '../../../InternalLog';
import { SdkVerbosity } from '../../../SdkVerbosity';
import { getGlobalInstance } from '../../../utils/singletonUtils';
import type { FirstPartyHost } from '../../types';

import { firstPartyHostsRegexMapBuilder } from './distributedTracing/firstPartyHosts';
import { ResourceReporter } from './requestProxy/XHRProxy/DatadogRumResource/ResourceReporter';
import { filterDevResource } from './requestProxy/XHRProxy/DatadogRumResource/internalDevResourceBlocklist';
import { XHRProxy } from './requestProxy/XHRProxy/XHRProxy';
import type { RequestProxy } from './requestProxy/interfaces/RequestProxy';

export const MAX_TRACE_ID = BigInt.one.shiftLeft(64).minus(BigInt.one);
const RUM_RESOURCE_TRACKING_MODULE =
    'com.datadog.reactnative.rum.resource_tracking';

/**
 * Provides RUM auto-instrumentation feature to track resources (fetch, XHR, axios) as RUM events.
 */
class RumResourceTracking {
    private _isTracking = false;
    private _requestProxy: RequestProxy | null = null;
    private _maxSampledTraceId: BigInt.BigInteger | null = null;

    get isTracking(): boolean {
        return this._isTracking;
    }

    get maxSampledTraceId(): BigInt.BigInteger {
        return this._maxSampledTraceId ?? BigInt(0);
    }

    /**
     * Starts tracking resources and sends a RUM Resource event every time a network request is detected.
     */
    startTracking({
        tracingSamplingRate,
        firstPartyHosts
    }: {
        tracingSamplingRate: number;
        firstPartyHosts: FirstPartyHost[];
    }): void {
        // extra safety to avoid proxying the XHR class twice
        if (this._isTracking) {
            InternalLog.log(
                'Datadog SDK is already tracking XHR resources',
                SdkVerbosity.WARN
            );
            return;
        }

        this._requestProxy = new XHRProxy({
            xhrType: XMLHttpRequest,
            resourceReporter: new ResourceReporter([filterDevResource])
        });
        this._requestProxy.onTrackingStart({
            tracingSamplingRate,
            firstPartyHostsRegexMap: firstPartyHostsRegexMapBuilder(
                firstPartyHosts
            )
        });

        InternalLog.log(
            'Datadog SDK is tracking XHR resources',
            SdkVerbosity.INFO
        );

        this._isTracking = true;
        this._maxSampledTraceId = RumResourceTracking.getMaxTraceId(
            tracingSamplingRate
        );
    }

    stopTracking(): void {
        if (this._isTracking) {
            this._isTracking = false;
            if (this._requestProxy) {
                this._requestProxy.onTrackingStop();
            }
            this._requestProxy = null;
            this._maxSampledTraceId = null;
        }
    }

    private static getMaxTraceId(sampleRate: number): BigInt.BigInteger {
        return BigInt(MAX_TRACE_ID.toJSNumber() * (sampleRate / 100.0));
    }
}

export const DdRumResourceTracking = getGlobalInstance(
    RUM_RESOURCE_TRACKING_MODULE,
    () => new RumResourceTracking()
);
