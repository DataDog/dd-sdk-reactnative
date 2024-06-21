/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { PropagatorType } from '../../../types';
import type { RegexMap } from '../requestProxy/interfaces/RequestProxy';

import { TracingIdentifier } from './TracingIdentifier';
import type { SpanId, TraceId } from './TracingIdentifier';
import type { Hostname } from './firstPartyHosts';
import { getPropagatorsForHost } from './firstPartyHosts';

export type DdRumResourceTracingAttributes =
    | {
          tracingStrategy: 'KEEP';
          traceId: TraceId;
          spanId: SpanId;
          samplingPriorityHeader: '1' | '0';
          rulePsr: number;
          propagatorTypes: PropagatorType[];
      }
    | {
          tracingStrategy: 'DISCARD';
          traceId?: void;
          spanId?: void;
          samplingPriorityHeader: '0';
      };

const DISCARDED_TRACE_ATTRIBUTES: DdRumResourceTracingAttributes = {
    samplingPriorityHeader: '0',
    tracingStrategy: 'DISCARD'
};

export const getTracingAttributes = ({
    hostname,
    firstPartyHostsRegexMap,
    tracingSamplingRate
}: {
    hostname: Hostname | null;
    firstPartyHostsRegexMap: RegexMap;
    tracingSamplingRate: number;
}): DdRumResourceTracingAttributes => {
    if (hostname === null) {
        return DISCARDED_TRACE_ATTRIBUTES;
    }
    const propagatorsForHost = getPropagatorsForHost(
        hostname,
        firstPartyHostsRegexMap
    );
    if (propagatorsForHost) {
        return generateTracingAttributesWithSampling(
            tracingSamplingRate,
            propagatorsForHost
        );
    }
    return DISCARDED_TRACE_ATTRIBUTES;
};

const generateTracingAttributesWithSampling = (
    tracingSamplingRate: number,
    propagatorTypes: PropagatorType[]
): DdRumResourceTracingAttributes => {
    const isSampled = Math.random() * 100 <= tracingSamplingRate;
    const tracingAttributes: DdRumResourceTracingAttributes = {
        traceId: TracingIdentifier.createTraceId(),
        spanId: TracingIdentifier.createSpanId(),
        samplingPriorityHeader: isSampled ? '1' : '0',
        tracingStrategy: 'KEEP',
        rulePsr: tracingSamplingRate / 100,
        propagatorTypes
    };

    return tracingAttributes;
};
