/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DatadogTracingIdentifier } from './DatadogTracingIdentifier';
import type { SpanId, TraceId } from './TracingIdentifier';

/**
 * An object that contains the tracing attributes as headers for network requests and attributes
 * for RUM Resources.
 */
export class DatadogTracingContext {
    private readonly headersForRequest: { header: string; value: string }[];
    private readonly rumResourceContext: Record<string, string | number>;
    readonly traceId?: DatadogTracingIdentifier;
    readonly spanId?: DatadogTracingIdentifier;

    constructor(
        requestHeaders: { header: string; value: string }[],
        resourceContext: Record<string, string | number>,
        traceId: TraceId | undefined | void,
        spanId: SpanId | undefined | void
    ) {
        this.headersForRequest = requestHeaders;
        this.rumResourceContext = resourceContext;
        this.traceId = traceId
            ? new DatadogTracingIdentifier(traceId)
            : undefined;
        this.spanId = spanId ? new DatadogTracingIdentifier(spanId) : undefined;
    }

    /**
     * Get the tracing headers to add to your network request.
     * @returns the headers for the request as a key-value object.
     */
    getHeadersForRequest(): Record<string, string> {
        return Object.fromEntries(
            this.headersForRequest.map(({ header, value }) => [header, value])
        );
    }

    /**
     * Get the tracing headers to add to your network request, as an array of key-value objects.
     * @returns the headers for the request as an array of key-value objects.
     */
    getHeadersForRequestAsArray(): { header: string; value: string }[] {
        return [...this.headersForRequest];
    }

    /**
     * Get the RUM Resource Context tracing attributes to your RUM Resource context.
     * @returns the RUM Resource context tracing attributes.
     */
    getRumResourceContext(): Record<string, string | number> {
        return { ...this.rumResourceContext };
    }

    /**
     * Convenience method to inject the tracing headers to your request.
     * @param inject a callback that is called for each header that should be added to your request.
     */
    injectHeadersForRequest(inject: (header: string, value: string) => void) {
        this.headersForRequest.forEach(({ header, value }) =>
            inject(header, value)
        );
    }

    /**
     * Convenience method to inject the RUM Resource attributes to your RUM Resource context.
     * @param inject a callback that is called for each attribute that should be added to your RUM Resource context.
     */
    injectRumResourceContext(
        inject: (attribute: string, value: string | number) => void
    ) {
        Object.keys(this.rumResourceContext).forEach((key: string) => {
            inject(key, this.rumResourceContext[key]);
        });
    }
}
