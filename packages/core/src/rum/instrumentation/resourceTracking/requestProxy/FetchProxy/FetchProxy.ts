/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { callOriginalFetch } from '../common/FetchProxyState';
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

const RESPONSE_START_LABEL = 'response_start';
const MISSING_RESOURCE_SIZE = -1;

type FetchGlobal = {
    fetch: typeof fetch;
};

interface FetchProxyProviders {
    fetchGlobal: FetchGlobal;
    headersType: typeof Headers;
    resourceReporter: ResourceReporter;
}

/**
 * Proxies global Fetch implementations.
 */
export class FetchProxy extends RequestProxy {
    private context: RequestProxyOptions | null = null;
    private originalFetch: typeof fetch | null = null;
    private installedFetch: typeof fetch | null = null;

    constructor(private providers: FetchProxyProviders) {
        super();
    }

    static createWithResourceReporter() {
        return new FetchProxy({
            fetchGlobal: globalThis,
            headersType: Headers,
            resourceReporter: new ResourceReporter([filterDevResource])
        });
    }

    onTrackingStart = (context: RequestProxyOptions) => {
        this.context = context;
        this.originalFetch = this.providers.fetchGlobal.fetch;

        const installedFetch: typeof fetch = (input, init) => {
            return trackFetch({
                input,
                init,
                originalFetch: this.originalFetch as typeof fetch,
                fetchThis: this.providers.fetchGlobal,
                headersType: this.providers.headersType,
                resourceReporter: this.providers.resourceReporter,
                options: context
            });
        };

        this.installedFetch = installedFetch;
        this.providers.fetchGlobal.fetch = installedFetch;
    };

    onTrackingStop = () => {
        if (
            this.originalFetch !== null &&
            this.providers.fetchGlobal.fetch === this.installedFetch
        ) {
            this.providers.fetchGlobal.fetch = this.originalFetch;
        }

        this.context = null;
        this.originalFetch = null;
        this.installedFetch = null;
    };

    onTrackingUpdate = (options: { tracingSamplingRate: number }) => {
        if (this.context === null) {
            return;
        }
        this.context.tracingSamplingRate = options.tracingSamplingRate;
    };
}

const trackFetch = async ({
    input,
    init,
    originalFetch,
    fetchThis,
    headersType,
    resourceReporter,
    options
}: {
    input: Parameters<typeof fetch>[0];
    init: Parameters<typeof fetch>[1];
    originalFetch: typeof fetch;
    fetchThis: FetchGlobal;
    headersType: typeof Headers;
    resourceReporter: ResourceReporter;
    options: RequestProxyOptions;
}): Promise<Response> => {
    const url = getRequestUrl(input);
    const method = getRequestMethod(input, init);
    const context = createRequestContext({ method, url, options });
    const headers = buildHeaders({ input, init, context, headersType });

    context.timer.start();

    try {
        const response = await callOriginalFetch(() =>
            originalFetch.call(fetchThis, input, {
                ...(init ?? {}),
                headers
            })
        );

        context.timer.recordTick(RESPONSE_START_LABEL);
        context.timer.stop();
        reportFetch({ context, response, resourceReporter });
        return response;
    } catch (error) {
        context.timer.stop();
        reportFetchFailure({ context, resourceReporter });
        throw error;
    }
};

const getRequestUrl = (input: Parameters<typeof fetch>[0]): string => {
    if (typeof input === 'string') {
        return input;
    }

    if (
        typeof input === 'object' &&
        input !== null &&
        'url' in input &&
        typeof input.url === 'string'
    ) {
        return input.url;
    }

    return String(input);
};

const getRequestMethod = (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
): string => {
    const requestMethod =
        typeof input === 'object' &&
        input !== null &&
        'method' in input &&
        typeof input.method === 'string'
            ? input.method
            : undefined;

    return (init?.method ?? requestMethod ?? 'GET').toUpperCase();
};

const buildHeaders = ({
    input,
    init,
    context,
    headersType
}: {
    input: Parameters<typeof fetch>[0];
    init?: Parameters<typeof fetch>[1];
    context: RequestContext;
    headersType: typeof Headers;
}): Headers => {
    const requestHeaders =
        typeof input === 'object' && input !== null && 'headers' in input
            ? input.headers
            : undefined;
    const headers: Headers = new headersType(init?.headers ?? requestHeaders);
    const originalHeaders: { header: string; value: string }[] = [];

    headers.forEach((value: string, header: string) => {
        originalHeaders.push({ header, value });
    });

    originalHeaders.forEach(({ header }) => headers.delete(header));
    originalHeaders.forEach(({ header, value }) => {
        applyHeader({ headers, context, header, value });
    });
    getInstrumentationHeaders(context).forEach(({ header, value }) => {
        applyHeader({ headers, context, header, value });
    });

    return headers;
};

const applyHeader = ({
    headers,
    context,
    header,
    value
}: {
    headers: Headers;
    context: RequestContext;
    header: string;
    value: string;
}) => {
    const processedHeader = processRequestHeader({ context, header, value });
    if (processedHeader.type === 'send') {
        headers.set(processedHeader.header, processedHeader.value);
    }
};

const reportFetch = ({
    context,
    response,
    resourceReporter
}: {
    context: RequestContext;
    response: Response;
    resourceReporter: ResourceReporter;
}) => {
    resourceReporter.reportResource({
        key: `${context.timer.startTime}/${context.method}`,
        request: {
            method: context.method,
            url: context.url,
            kind: 'fetch'
        },
        graphqlAttributes: context.graphql,
        tracingAttributes: context.tracingAttributes,
        response: {
            statusCode: response.status,
            size: getResponseSize(response)
        },
        timings: {
            startTime: context.timer.startTime,
            stopTime: context.timer.stopTime,
            responseStartTime: context.timer.timeAt(RESPONSE_START_LABEL)
        }
    });
};

const reportFetchFailure = ({
    context,
    resourceReporter
}: {
    context: RequestContext;
    resourceReporter: ResourceReporter;
}) => {
    resourceReporter.reportResource({
        key: `${context.timer.startTime}/${context.method}`,
        request: {
            method: context.method,
            url: context.url,
            kind: 'fetch'
        },
        graphqlAttributes: context.graphql,
        tracingAttributes: context.tracingAttributes,
        response: {
            statusCode: 0,
            size: MISSING_RESOURCE_SIZE
        },
        timings: {
            startTime: context.timer.startTime,
            stopTime: context.timer.stopTime
        }
    });
};

const getResponseSize = (response: Response): number => {
    const contentLength = response.headers.get('content-length');
    if (contentLength === null || !/^\d+$/.test(contentLength)) {
        return MISSING_RESOURCE_SIZE;
    }

    return Number(contentLength);
};
