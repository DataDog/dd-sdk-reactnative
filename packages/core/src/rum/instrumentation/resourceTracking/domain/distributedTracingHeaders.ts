/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { PropagatorType } from '../../../../../src/DdSdkReactNativeConfiguration';

import type { DdRumResourceTracingAttributes } from './distributedTracing';

export const SAMPLING_PRIORITY_HEADER_KEY = 'x-datadog-sampling-priority';
/**
 * Datadog headers
 */
export const TRACE_ID_HEADER_KEY = 'x-datadog-trace-id';
export const PARENT_ID_HEADER_KEY = 'x-datadog-parent-id';

export const getTracingHeaders = (
    tracingAttributes: DdRumResourceTracingAttributes
): { header: string; value: string }[] => {
    const headers: { header: string; value: string }[] = [
        {
            header: SAMPLING_PRIORITY_HEADER_KEY,
            value: tracingAttributes.samplingPriorityHeader
        }
    ];
    if (tracingAttributes.tracingStrategy === 'DISCARD') {
        return headers;
    }
    if (tracingAttributes.propagators[PropagatorType.DATADOG] === 'SAMPLED') {
        headers.push({
            header: TRACE_ID_HEADER_KEY,
            value: tracingAttributes.traceId.toString(10)
        });
        headers.push({
            header: PARENT_ID_HEADER_KEY,
            value: tracingAttributes.spanId.toString(10)
        });
    }

    return headers;
};
