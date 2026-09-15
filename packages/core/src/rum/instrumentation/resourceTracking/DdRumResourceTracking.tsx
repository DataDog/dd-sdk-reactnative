/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import BigInt from 'big-integer';

import { InternalLog } from '../../../InternalLog';
import { SdkVerbosity } from '../../../config/types/SdkVerbosity';
import { getGlobalInstance } from '../../../utils/singletonUtils';
import type { FirstPartyHost } from '../../types';

import { DistributedTracingSampling } from './distributedTracing/distributedTracingSampling';
import { firstPartyHostsRegexMapBuilder } from './distributedTracing/firstPartyHosts';
import { FetchProxy } from './requestProxy/FetchProxy/FetchProxy';
import { XHRProxy } from './requestProxy/XHRProxy/XHRProxy';
import type { RequestProxy } from './requestProxy/interfaces/RequestProxy';

const RUM_RESOURCE_TRACKING_MODULE =
    'com.datadog.reactnative.rum.resource_tracking';

/**
 * Provides RUM auto-instrumentation feature to track resources (fetch, XHR, axios) as RUM events.
 */
class RumResourceTracking {
    private _isTracking = false;
    private _requestProxies: RequestProxy[] = [];
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
        resourceTraceSampleRate,
        firstPartyHosts,
        trackFetchResources = false
    }: {
        resourceTraceSampleRate: number;
        firstPartyHosts: FirstPartyHost[];
        trackFetchResources?: boolean;
    }): void {
        // extra safety to avoid proxying the XHR class twice
        if (this._isTracking) {
            InternalLog.log(
                'Datadog SDK is already tracking resources',
                SdkVerbosity.WARN
            );
            return;
        }

        const requestProxyOptions = {
            tracingSamplingRate: resourceTraceSampleRate,
            firstPartyHostsRegexMap: firstPartyHostsRegexMapBuilder(
                firstPartyHosts
            )
        };

        const xhrProxy = XHRProxy.createWithResourceReporter();
        xhrProxy.onTrackingStart(requestProxyOptions);
        this._requestProxies.push(xhrProxy);

        InternalLog.log(
            'Datadog SDK is tracking XHR resources',
            SdkVerbosity.INFO
        );

        if (trackFetchResources) {
            if (typeof globalThis.fetch !== 'function') {
                InternalLog.log(
                    'Datadog SDK did not install Fetch resource tracking because global Fetch is not available',
                    SdkVerbosity.INFO
                );
            } else {
                const fetchProxy = FetchProxy.createWithResourceReporter();
                fetchProxy.onTrackingStart(requestProxyOptions);
                this._requestProxies.push(fetchProxy);
                InternalLog.log(
                    'Datadog SDK is tracking Fetch resources',
                    SdkVerbosity.INFO
                );
            }
        }

        this._isTracking = true;
        DistributedTracingSampling.setResourceTraceSampleRate(
            resourceTraceSampleRate
        );
    }

    /**
     * Applies a new resource trace sample rate to the already-installed
     * request proxy. Used by deferred-initialization flows
     * (DatadogProvider.initialize) where tracking is started at provider
     * mount with default features, and the final sample rate is only known
     * later. No-op if tracking has not started.
     */
    updateTrackingContext({
        resourceTraceSampleRate
    }: {
        resourceTraceSampleRate: number;
    }): void {
        if (!this._isTracking) {
            return;
        }
        this._requestProxies.forEach(requestProxy => {
            requestProxy.onTrackingUpdate({
                tracingSamplingRate: resourceTraceSampleRate
            });
        });
        // Keep the distributed-tracing sampler's max-trace-id in sync; the
        // shouldSampleTrace path consults this for rates strictly between 0
        // and 100.
        DistributedTracingSampling.setResourceTraceSampleRate(
            resourceTraceSampleRate
        );
    }

    stopTracking(): void {
        if (this._isTracking) {
            this._isTracking = false;
            this._requestProxies.forEach(requestProxy =>
                requestProxy.onTrackingStop()
            );
            this._requestProxies = [];
            this._maxSampledTraceId = null;
        }
    }
}

export const DdRumResourceTracking = getGlobalInstance(
    RUM_RESOURCE_TRACKING_MODULE,
    () => new RumResourceTracking()
);
