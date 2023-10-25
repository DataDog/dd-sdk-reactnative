/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Timer from '../../../../../utils/Timer';
import { getTracingHeaders } from '../../distributedTracing/distributedTracingHeaders';
import type { DdRumResourceTracingAttributes } from '../../distributedTracing/distributedTracing';
import { getTracingAttributes } from '../../distributedTracing/distributedTracing';
import {
    DATADOG_GRAPH_QL_OPERATION_NAME_HEADER,
    DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER,
    DATADOG_GRAPH_QL_VARIABLES_HEADER,
    isDatadogCustomHeader
} from '../../graphql/graphqlHeaders';
import type { RequestProxyOptions } from '../interfaces/RequestProxy';
import { RequestProxy } from '../interfaces/RequestProxy';

import type { ResourceReporter } from './DatadogRumResource/ResourceReporter';
import { URLHostParser } from './URLHostParser';
import { calculateResponseSize } from './responseSize';

const RESPONSE_START_LABEL = 'response_start';

interface DdRumXhr extends XMLHttpRequest {
    _datadog_xhr: DdRumXhrContext;
}

interface DdRumXhrContext {
    graphql: {
        operationType?: string;
        operationName?: string;
        variables?: string;
    };
    method: string;
    url: string;
    reported: boolean;
    timer: Timer;
    tracingAttributes: DdRumResourceTracingAttributes;
}

interface XHRProxyProviders {
    xhrType: typeof XMLHttpRequest;
    resourceReporter: ResourceReporter;
}

/**
 * Proxies XMLHTTPRequest to track resources.
 */
export class XHRProxy extends RequestProxy {
    private providers: XHRProxyProviders;
    private static originalXhrOpen: typeof XMLHttpRequest.prototype.open;
    private static originalXhrSend: typeof XMLHttpRequest.prototype.send;
    private static originalXhrSetRequestHeader: typeof XMLHttpRequest.prototype.setRequestHeader;

    constructor(providers: XHRProxyProviders) {
        super();
        this.providers = providers;
    }

    onTrackingStart = (context: RequestProxyOptions) => {
        XHRProxy.originalXhrOpen = this.providers.xhrType.prototype.open;
        XHRProxy.originalXhrSend = this.providers.xhrType.prototype.send;
        XHRProxy.originalXhrSetRequestHeader = this.providers.xhrType.prototype.setRequestHeader;
        proxyRequests(this.providers, context);
    };

    onTrackingStop = () => {
        this.providers.xhrType.prototype.open = XHRProxy.originalXhrOpen;
        this.providers.xhrType.prototype.send = XHRProxy.originalXhrSend;
        this.providers.xhrType.prototype.setRequestHeader =
            XHRProxy.originalXhrSetRequestHeader;
    };
}

const proxyRequests = (
    providers: XHRProxyProviders,
    context: RequestProxyOptions
): void => {
    proxyOpen(providers, context);
    proxySend(providers);
    proxySetRequestHeader(providers);
};

const proxyOpen = (
    { xhrType }: XHRProxyProviders,
    context: RequestProxyOptions
): void => {
    const originalXhrOpen = xhrType.prototype.open;
    const firstPartyHostsRegexMap = context.firstPartyHostsRegexMap;
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
            graphql: {},
            tracingAttributes: getTracingAttributes({
                hostname,
                firstPartyHostsRegexMap,
                tracingSamplingRate
            })
        };
        // eslint-disable-next-line prefer-rest-params
        return originalXhrOpen.apply(this, arguments as any);
    };
};

const proxySend = (providers: XHRProxyProviders): void => {
    const xhrType = providers.xhrType;
    const originalXhrSend = xhrType.prototype.send;

    xhrType.prototype.send = function (this: DdRumXhr) {
        if (this._datadog_xhr) {
            // keep track of start time
            this._datadog_xhr.timer.start();

            const tracingHeaders = getTracingHeaders(
                this._datadog_xhr.tracingAttributes
            );
            tracingHeaders.forEach(({ header, value }) => {
                this.setRequestHeader(header, value);
            });
        }

        proxyOnReadyStateChange(this, providers);

        // eslint-disable-next-line prefer-rest-params
        return originalXhrSend.apply(this, arguments as any);
    };
};

const proxyOnReadyStateChange = (
    xhrProxy: DdRumXhr,
    providers: XHRProxyProviders
): void => {
    const xhrType = providers.xhrType;
    const originalOnreadystatechange = xhrProxy.onreadystatechange;

    xhrProxy.onreadystatechange = function () {
        if (xhrProxy.readyState === xhrType.DONE) {
            if (!xhrProxy._datadog_xhr.reported) {
                reportXhr(xhrProxy, providers.resourceReporter);
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

const reportXhr = async (
    xhrProxy: DdRumXhr,
    resourceReporter: ResourceReporter
): Promise<void> => {
    const responseSize = calculateResponseSize(xhrProxy);

    const context = xhrProxy._datadog_xhr;

    const key = `${context.timer.startTime}/${context.method}`;

    context.timer.stop();

    resourceReporter.reportResource({
        key,
        request: {
            method: context.method,
            url: context.url,
            kind: 'xhr'
        },
        graphqlAttributes: context.graphql,
        tracingAttributes: context.tracingAttributes,
        response: {
            statusCode: xhrProxy.status,
            size: responseSize
        },
        timings: {
            startTime: context.timer.startTime,
            stopTime: context.timer.stopTime,
            responseStartTime: context.timer.hasTickFor(RESPONSE_START_LABEL)
                ? context.timer.timeAt(RESPONSE_START_LABEL)
                : undefined
        },
        resourceContext: xhrProxy
    });
};

const proxySetRequestHeader = (providers: XHRProxyProviders): void => {
    const xhrType = providers.xhrType;
    const originalXhrSetRequestHeader = xhrType.prototype.setRequestHeader;

    xhrType.prototype.setRequestHeader = function (
        this: DdRumXhr,
        header: string,
        value: string
    ) {
        if (isDatadogCustomHeader(header)) {
            if (header === DATADOG_GRAPH_QL_OPERATION_NAME_HEADER) {
                this._datadog_xhr.graphql.operationName = value;
                return;
            }
            if (header === DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER) {
                this._datadog_xhr.graphql.operationType = value;
                return;
            }
            if (header === DATADOG_GRAPH_QL_VARIABLES_HEADER) {
                this._datadog_xhr.graphql.variables = value;
                return;
            }
        }

        // eslint-disable-next-line prefer-rest-params
        return originalXhrSetRequestHeader.apply(this, arguments as any);
    };
};
