/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { PropagatorType } from '../../../types';

import { TracingIdFormat } from './TracingIdentifier';
import type { TraceId, SpanId } from './TracingIdentifier';
import type { DdRumResourceTracingAttributes } from './distributedTracing';

export const SAMPLING_PRIORITY_HEADER_KEY = 'x-datadog-sampling-priority';
/**
 * Datadog headers
 */
export const ORIGIN_HEADER_KEY = 'x-datadog-origin';
export const ORIGIN_RUM = 'rum';
export const TRACE_ID_HEADER_KEY = 'x-datadog-trace-id';
export const PARENT_ID_HEADER_KEY = 'x-datadog-parent-id';
export const TAGS_HEADER_KEY = 'x-datadog-tags';
export const DD_TRACE_ID_TAG = '_dd.p.tid';

/**
 * OTel headers
 */
export const TRACECONTEXT_HEADER_KEY = 'traceparent';
export const TRACESTATE_HEADER_KEY = 'tracestate';
export const B3_HEADER_KEY = 'b3';
export const B3_MULTI_TRACE_ID_HEADER_KEY = 'X-B3-TraceId';
export const B3_MULTI_SPAN_ID_HEADER_KEY = 'X-B3-SpanId';
export const B3_MULTI_SAMPLED_HEADER_KEY = 'X-B3-Sampled';

export const getTracingHeaders = (
    tracingAttributes: DdRumResourceTracingAttributes
): { header: string; value: string }[] => {
    const headers: { header: string; value: string }[] = [];
    if (tracingAttributes.tracingStrategy === 'DISCARD') {
        return headers;
    }
    tracingAttributes.propagatorTypes.forEach(propagator => {
        switch (propagator) {
            case PropagatorType.DATADOG: {
                headers.push(
                    {
                        header: ORIGIN_HEADER_KEY,
                        value: ORIGIN_RUM
                    },
                    {
                        header: SAMPLING_PRIORITY_HEADER_KEY,
                        value: tracingAttributes.samplingPriorityHeader
                    },
                    {
                        header: TRACE_ID_HEADER_KEY,
                        value: tracingAttributes.traceId.toString(
                            TracingIdFormat.lowDecimal
                        )
                    },
                    {
                        header: PARENT_ID_HEADER_KEY,
                        value: tracingAttributes.spanId.toString(
                            TracingIdFormat.decimal
                        )
                    },
                    {
                        header: TAGS_HEADER_KEY,
                        value: `${DD_TRACE_ID_TAG}=${tracingAttributes.traceId.toString(
                            TracingIdFormat.paddedHighHex
                        )}`
                    }
                );
                break;
            }
            case PropagatorType.TRACECONTEXT: {
                headers.push(
                    {
                        header: TRACECONTEXT_HEADER_KEY,
                        value: generateTraceContextHeader({
                            version: '00',
                            traceId: tracingAttributes.traceId,
                            parentId: tracingAttributes.spanId,
                            isSampled:
                                tracingAttributes.samplingPriorityHeader === '1'
                        })
                    },
                    {
                        header: TRACESTATE_HEADER_KEY,
                        value: generateTraceStateHeader({
                            parentId: tracingAttributes.spanId,
                            isSampled:
                                tracingAttributes.samplingPriorityHeader === '1'
                        })
                    }
                );
                break;
            }
            case PropagatorType.B3: {
                headers.push({
                    header: B3_HEADER_KEY,
                    value: generateB3Header({
                        traceId: tracingAttributes.traceId,
                        spanId: tracingAttributes.spanId,
                        isSampled:
                            tracingAttributes.samplingPriorityHeader === '1'
                    })
                });
                break;
            }
            case PropagatorType.B3MULTI: {
                headers.push(
                    {
                        header: B3_MULTI_TRACE_ID_HEADER_KEY,
                        value: tracingAttributes.traceId.toString(
                            TracingIdFormat.paddedHex
                        )
                    },
                    {
                        header: B3_MULTI_SPAN_ID_HEADER_KEY,
                        value: tracingAttributes.spanId.toString(
                            TracingIdFormat.paddedHex
                        )
                    },
                    {
                        header: B3_MULTI_SAMPLED_HEADER_KEY,
                        value: tracingAttributes.samplingPriorityHeader
                    }
                );
            }
        }
    });

    return headers;
};

const generateTraceContextHeader = ({
    version,
    traceId,
    parentId,
    isSampled
}: {
    version: string;
    traceId: TraceId;
    parentId: SpanId;
    isSampled: boolean;
}) => {
    const flags = isSampled ? '01' : '00';
    return `${version}-${traceId.toString(
        TracingIdFormat.paddedHex
    )}-${parentId.toString(TracingIdFormat.paddedHex)}-${flags}`;
};

const generateTraceStateHeader = ({
    parentId,
    isSampled
}: {
    parentId: SpanId;
    isSampled: boolean;
}) => {
    const sampled = `s:${isSampled ? '1' : '0'}`;
    const origin = 'o:rum';
    const parent = `p:${parentId.toString(TracingIdFormat.paddedHex)}`;

    return `dd=${sampled};${origin};${parent}`;
};

const generateB3Header = ({
    traceId,
    spanId,
    isSampled
}: {
    traceId: TraceId;
    spanId: SpanId;
    isSampled: boolean;
}) => {
    return [
        traceId.toString(TracingIdFormat.paddedHex),
        spanId.toString(TracingIdFormat.paddedHex),
        isSampled ? '1' : '0'
    ].join('-');
};
