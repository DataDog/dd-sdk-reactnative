/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import BigInt from 'big-integer';

import type { PropagatorType } from '../../../types';
import { DdRumResourceTracking, MAX_TRACE_ID } from '../DdRumResourceTracking';
import type { RegexMap } from '../requestProxy/interfaces/RequestProxy';

import { TracingIdentifier } from './TracingIdentifier';
import type { SpanId, TraceId } from './TracingIdentifier';
import type { Hostname } from './firstPartyHosts';
import { getPropagatorsForHost } from './firstPartyHosts';

const KNUTH_FACTOR = BigInt('1111111111111111111');

export type DdRumResourceTracingAttributes =
    | {
          tracingStrategy: 'KEEP';
          traceId: TraceId;
          spanId: SpanId;
          samplingPriorityHeader: '1' | '0';
          rulePsr: number;
          propagatorTypes: PropagatorType[];
          rumSessionId?: string;
          userId?: string;
          accountId?: string;
          baggageHeaders?: Set<string>;
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
    tracingSamplingRate,
    rumSessionId,
    userId,
    accountId
}: {
    hostname: Hostname | null;
    firstPartyHostsRegexMap: RegexMap;
    tracingSamplingRate: number;
    rumSessionId?: string;
    userId?: string;
    accountId?: string;
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
            propagatorsForHost,
            rumSessionId,
            userId,
            accountId
        );
    }
    return DISCARDED_TRACE_ATTRIBUTES;
};

export const shouldSampleTrace = (
    tracingSamplingRate: number,
    sessionId: string | null | undefined,
    traceId: TraceId
): boolean => {
    if (tracingSamplingRate >= 100) {
        return true;
    }
    if (tracingSamplingRate <= 0) {
        return false;
    }

    // Offer consistent sampling for the same trace id across different environments. The rule is:
    //
    //   (identifier * knuthFactor) < max_trace_id
    //
    // We use the low 48 bits from the session id if it exists, or the low bits of the trace id if it doesn't
    let lowBits: BigInt.BigInteger | null = null;

    if (sessionId != null) {
        const uuidParts = sessionId.split('-');
        if (uuidParts.length === 5) {
            const lastPart = uuidParts[4];
            try {
                // Parse last UUID part as hex into bigint
                lowBits = BigInt(`${lastPart}`, 16);
            } catch {
                // ignore parse errors, lowBits stays null
            }
        }
    }

    if (lowBits === null) {
        lowBits = traceId.id.and(MAX_TRACE_ID);
    }

    return lowBits
        .multiply(KNUTH_FACTOR)
        .and(MAX_TRACE_ID)
        .lesser(DdRumResourceTracking.maxSampledTraceId);
};

export const generateTracingAttributesWithSampling = (
    tracingSamplingRate: number,
    propagatorTypes: PropagatorType[],
    rumSessionId?: string,
    userId?: string,
    accountId?: string
): DdRumResourceTracingAttributes => {
    if (!propagatorTypes || propagatorTypes.length === 0) {
        return DISCARDED_TRACE_ATTRIBUTES;
    }

    const traceId = TracingIdentifier.createTraceId();

    const isSampled = shouldSampleTrace(
        tracingSamplingRate,
        rumSessionId,
        traceId
    );

    const tracingAttributes: DdRumResourceTracingAttributes = {
        traceId,
        spanId: TracingIdentifier.createSpanId(),
        samplingPriorityHeader: isSampled ? '1' : '0',
        tracingStrategy: 'KEEP',
        rulePsr: tracingSamplingRate / 100,
        propagatorTypes,
        rumSessionId,
        userId,
        accountId
    };

    return tracingAttributes;
};
