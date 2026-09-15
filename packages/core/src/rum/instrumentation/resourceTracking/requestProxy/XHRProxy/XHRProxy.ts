/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../../../InternalLog';
import { SdkVerbosity } from '../../../../../config/types';
import { extractGraphQLErrors } from '../../graphql/graphqlUtils';
import { isRunningWithinFetchProxy } from '../common/FetchProxyState';
import type { RequestContext } from '../common/RequestContext';
import { createRequestContext } from '../common/RequestContext';
import { ResourceReporter } from '../common/ResourceReporter';
import { filterDevResource } from '../common/internalDevResourceBlocklist';
import {
    getInstrumentationHeaders,
    processRequestHeader
} from '../common/requestHeaders';
import type { RequestProxyOptions } from '../interfaces/RequestProxy';
import { RequestProxy } from '../interfaces/RequestProxy';

import { calculateResponseSize } from './responseSize';
import { getErrorData, readXhrJsonBody } from './xhrUtils';

const RESPONSE_START_LABEL = 'response_start';

interface DdRumXhr extends XMLHttpRequest {
    _datadog_xhr?: DdRumXhrContext;
}

interface DdRumXhrContext extends RequestContext {
    reported: boolean;
}

interface XHRProxyProviders {
    xhrType: typeof XMLHttpRequest;
    resourceReporter: ResourceReporter;
}

/**
 * Proxies XMLHttpRequest to track resources.
 */
export class XHRProxy extends RequestProxy {
    private providers: XHRProxyProviders;
    private context: RequestProxyOptions | null = null;
    private static originalXhrOpen: typeof XMLHttpRequest.prototype.open;
    private static originalXhrSend: typeof XMLHttpRequest.prototype.send;
    private static originalXhrSetRequestHeader: typeof XMLHttpRequest.prototype.setRequestHeader;

    constructor(providers: XHRProxyProviders) {
        super();
        this.providers = providers;
    }

    static createWithResourceReporter() {
        return new XHRProxy({
            xhrType: XMLHttpRequest,
            resourceReporter: new ResourceReporter([filterDevResource])
        });
    }

    onTrackingStart = (context: RequestProxyOptions) => {
        XHRProxy.originalXhrOpen = this.providers.xhrType.prototype.open;
        XHRProxy.originalXhrSend = this.providers.xhrType.prototype.send;
        XHRProxy.originalXhrSetRequestHeader = this.providers.xhrType.prototype.setRequestHeader;
        this.context = context;
        proxyRequests(this.providers, context);
    };

    onTrackingStop = () => {
        this.providers.xhrType.prototype.open = XHRProxy.originalXhrOpen;
        this.providers.xhrType.prototype.send = XHRProxy.originalXhrSend;
        this.providers.xhrType.prototype.setRequestHeader =
            XHRProxy.originalXhrSetRequestHeader;
        this.context = null;
    };

    onTrackingUpdate = (options: { tracingSamplingRate: number }) => {
        if (this.context === null) {
            return;
        }
        this.context.tracingSamplingRate = options.tracingSamplingRate;
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

    xhrType.prototype.open = function open(
        this: DdRumXhr,
        method: string,
        url: string
    ) {
        if (isRunningWithinFetchProxy()) {
            this._datadog_xhr = undefined;
            // eslint-disable-next-line prefer-rest-params
            return originalXhrOpen.apply(this, arguments as any);
        }

        // Keep track of the method and url
        // start time is tracked by the `send` method
        this._datadog_xhr = {
            ...createRequestContext({ method, url, options: context }),
            reported: false
        };
        // eslint-disable-next-line prefer-rest-params
        return originalXhrOpen.apply(this, arguments as any);
    };
};

const proxySend = (providers: XHRProxyProviders): void => {
    const xhrType = providers.xhrType;
    const originalXhrSend = xhrType.prototype.send;

    xhrType.prototype.send = function send(this: DdRumXhr) {
        if (this._datadog_xhr) {
            // keep track of start time
            this._datadog_xhr.timer.start();

            getInstrumentationHeaders(this._datadog_xhr).forEach(
                ({ header, value }) => {
                    this.setRequestHeader(header, value);
                }
            );
            proxyOnReadyStateChange(this, providers);
        }

        // eslint-disable-next-line prefer-rest-params
        return originalXhrSend.apply(this, arguments as any);
    };
};

const proxyOnReadyStateChange = (
    xhrProxy: DdRumXhr,
    providers: XHRProxyProviders
): void => {
    const xhrType = providers.xhrType;
    const requestContext = xhrProxy._datadog_xhr;
    if (!requestContext) {
        return;
    }
    const originalOnreadystatechange = xhrProxy.onreadystatechange;

    xhrProxy.onreadystatechange = function onreadystatechange() {
        if (xhrProxy.readyState === xhrType.DONE) {
            if (!requestContext.reported) {
                reportXhr(xhrProxy, providers.resourceReporter).catch(error => {
                    const errorData = getErrorData(error);
                    if (errorData) {
                        InternalLog.log(
                            `reportXhr failed: ${errorData}`,
                            SdkVerbosity.WARN
                        );
                    }
                });
                requestContext.reported = true;
            }
        } else if (xhrProxy.readyState === xhrType.HEADERS_RECEIVED) {
            requestContext.timer.recordTick(RESPONSE_START_LABEL);
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
    if (!context) {
        return;
    }

    const key = `${context.timer.startTime}/${context.method}`;

    context.timer.stop();

    // Only extract GraphQL errors if operationType is set AND error tracking is enabled
    if (context.graphql.operationType && context.graphql.trackErrors) {
        try {
            const body = await readXhrJsonBody(xhrProxy);

            const errors = body?.errors;
            if (Array.isArray(errors) && errors.length > 0) {
                const filtered = extractGraphQLErrors(errors);

                if (filtered.length > 0) {
                    context.graphql.errors = filtered;
                }
            }
        } catch (error) {
            const errorData = getErrorData(error);
            if (errorData) {
                InternalLog.log(`reportXhr: ${errorData}`, SdkVerbosity.WARN);
            }
        }
    }

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

    xhrType.prototype.setRequestHeader = function sendRequestHeader(
        this: DdRumXhr,
        header: string,
        value: string
    ) {
        if (!this._datadog_xhr) {
            return originalXhrSetRequestHeader.apply(this, [header, value]);
        }

        const processedHeader = processRequestHeader({
            context: this._datadog_xhr,
            header,
            value
        });

        if (processedHeader.type === 'send') {
            return originalXhrSetRequestHeader.apply(this, [
                processedHeader.header,
                processedHeader.value
            ]);
        }
    };
};
