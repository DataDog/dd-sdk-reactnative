/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Timer from '../../../../Timer';
import { DdRum } from '../../../../foundation';
import type { DdRumXhr } from '../../DdRumXhr';
import type { RequestProxyOptions } from '../domain/interfaces/RequestProxy';
import { RequestProxy } from '../domain/interfaces/RequestProxy';

import { URLHostParser } from './URLHostParser';
import { getTracingAttributes } from './distributedTracing';
import { createTimings } from './resourceTiming';
import { calculateResponseSize } from './responseSize';

export const TRACE_ID_HEADER_KEY = 'x-datadog-trace-id';
export const PARENT_ID_HEADER_KEY = 'x-datadog-parent-id';
export const ORIGIN_HEADER_KEY = 'x-datadog-origin';
export const SAMPLING_PRIORITY_HEADER_KEY = 'x-datadog-sampling-priority';
export const ORIGIN_RUM = 'rum';

const RESPONSE_START_LABEL = 'response_start';

/**
 * Proxies XMLHTTPRequest to track resources.
 */
export class XHRProxy extends RequestProxy {
    private xhrProxy: typeof XMLHttpRequest;
    private static originalXhrOpen: typeof XMLHttpRequest.prototype.open;
    private static originalXhrSend: typeof XMLHttpRequest.prototype.send;

    constructor(xhrProxy: typeof XMLHttpRequest) {
        super();
        this.xhrProxy = xhrProxy;
    }

    onTrackingStart = (context: RequestProxyOptions) => {
        XHRProxy.originalXhrOpen = this.xhrProxy.prototype.open;
        XHRProxy.originalXhrSend = this.xhrProxy.prototype.send;
        proxyRequests(this.xhrProxy, context);
    };

    onTrackingStop = () => {
        this.xhrProxy.prototype.open = XHRProxy.originalXhrOpen;
        this.xhrProxy.prototype.send = XHRProxy.originalXhrSend;
    };
}

const proxyRequests = (
    xhrType: typeof XMLHttpRequest,
    context: RequestProxyOptions
): void => {
    proxyOpen(xhrType, context);
    proxySend(xhrType);
};

const proxyOpen = (
    xhrType: typeof XMLHttpRequest,
    context: RequestProxyOptions
): void => {
    const originalXhrOpen = xhrType.prototype.open;
    const firstPartyHostsRegex = context.firstPartyHostsRegex;
    const tracingSamplingRate = context.tracingSamplingRate;

    xhrType.prototype.open = function (
        this: DdRumXhr,
        method: string,
        url: string
    ) {
        const hostname = URLHostParser(url);
        // Keep track of the method and url
        // start time is tracked by the `send` method
        this._datadog_xhr = {
            method,
            url,
            reported: false,
            timer: new Timer(),
            tracingAttributes: getTracingAttributes({
                hostname,
                firstPartyHostsRegex,
                tracingSamplingRate
            })
        };
        // eslint-disable-next-line prefer-rest-params
        return originalXhrOpen.apply(this, arguments as any);
    };
};

const proxySend = (xhrType: typeof XMLHttpRequest): void => {
    const originalXhrSend = xhrType.prototype.send;

    xhrType.prototype.send = function (this: DdRumXhr) {
        if (this._datadog_xhr) {
            // keep track of start time
            this._datadog_xhr.timer.start();
            this.setRequestHeader(ORIGIN_HEADER_KEY, ORIGIN_RUM);

            const tracingAttributes = this._datadog_xhr.tracingAttributes;
            this.setRequestHeader(
                SAMPLING_PRIORITY_HEADER_KEY,
                tracingAttributes.samplingPriorityHeader
            );
            if (tracingAttributes.tracingStrategy !== 'DISCARD') {
                this.setRequestHeader(
                    TRACE_ID_HEADER_KEY,
                    tracingAttributes.traceId
                );
                this.setRequestHeader(
                    PARENT_ID_HEADER_KEY,
                    tracingAttributes.spanId
                );
            }
        }

        proxyOnReadyStateChange(this, xhrType);

        // eslint-disable-next-line prefer-rest-params
        return originalXhrSend.apply(this, arguments as any);
    };
};

const proxyOnReadyStateChange = (
    xhrProxy: DdRumXhr,
    xhrType: typeof XMLHttpRequest
): void => {
    const originalOnreadystatechange = xhrProxy.onreadystatechange;

    xhrProxy.onreadystatechange = function () {
        if (xhrProxy.readyState === xhrType.DONE) {
            if (!xhrProxy._datadog_xhr.reported) {
                reportXhr(xhrProxy);
                xhrProxy._datadog_xhr.reported = true;
            }
        } else if (xhrProxy.readyState === xhrType.HEADERS_RECEIVED) {
            xhrProxy._datadog_xhr.timer.recordTick(RESPONSE_START_LABEL);
        }

        if (originalOnreadystatechange) {
            // eslint-disable-next-line prefer-rest-params
            originalOnreadystatechange.apply(xhrProxy, arguments as any);
        }
    };
};

const reportXhr = async (xhrProxy: DdRumXhr): Promise<void> => {
    const responseSize = calculateResponseSize(xhrProxy);

    const context = xhrProxy._datadog_xhr;

    const key = `${context.timer.startTime}/${context.method}`;

    context.timer.stop();

    await DdRum.startResource(
        key,
        context.method,
        context.url,
        context.tracingAttributes.tracingStrategy === 'DISCARD'
            ? undefined
            : {
                  '_dd.span_id': context.tracingAttributes.spanId,
                  '_dd.trace_id': context.tracingAttributes.traceId
              },
        context.timer.startTime
    );

    DdRum.stopResource(
        key,
        xhrProxy.status,
        'xhr',
        responseSize,
        {
            '_dd.resource_timings': context.timer.hasTickFor(
                RESPONSE_START_LABEL
            )
                ? createTimings(
                      context.timer.startTime,
                      context.timer.timeAt(RESPONSE_START_LABEL),
                      context.timer.stopTime
                  )
                : null
        },
        context.timer.stopTime
    );
};
