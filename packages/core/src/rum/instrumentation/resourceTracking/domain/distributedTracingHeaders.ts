/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { PropagatorType } from '../../../../DdSdkReactNativeConfiguration';

import type {
    DdRumResourceTracingAttributes,
    SpanId,
    TraceId
} from './distributedTracing';

export const SAMPLING_PRIORITY_HEADER_KEY = 'x-datadog-sampling-priority';
/**
 * Datadog headers
 */
export const ORIGIN_HEADER_KEY = 'x-datadog-origin';
export const ORIGIN_RUM = 'rum';
export const TRACE_ID_HEADER_KEY = 'x-datadog-trace-id';
export const PARENT_ID_HEADER_KEY = 'x-datadog-parent-id';
/**
 * OTel headers
 */
export const TRACECONTEXT_HEADER_KEY = 'traceparent';
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
    tracingAttributes.propagators.forEach(propagator => {
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
                        value: tracingAttributes.traceId.toString(10)
                    },
                    {
                        header: PARENT_ID_HEADER_KEY,
                        value: tracingAttributes.spanId.toString(10)
                    }
                );
                break;
            }
            case PropagatorType.TRACECONTEXT: {
                headers.push({
                    header: TRACECONTEXT_HEADER_KEY,
                    value: generateTraceContextHeader({
                        version: '00',
                        traceId: tracingAttributes.traceId,
                        parentId: tracingAttributes.spanId,
                        isSampled:
                            tracingAttributes.samplingPriorityHeader === '1'
                    })
                });
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
                        value: tracingAttributes.traceId.toPaddedString(16, 32)
                    },
                    {
                        header: B3_MULTI_SPAN_ID_HEADER_KEY,
                        value: tracingAttributes.spanId.toPaddedString(16, 16)
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
    return `${version}-${traceId.toPaddedString(
        16,
        32
    )}-${parentId.toPaddedString(16, 16)}-${flags}`;
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
    const flags = isSampled ? '1' : '0';
    return `${traceId.toPaddedString(16, 32)}-${spanId.toPaddedString(
        16,
        16
    )}-${flags}`;
};
