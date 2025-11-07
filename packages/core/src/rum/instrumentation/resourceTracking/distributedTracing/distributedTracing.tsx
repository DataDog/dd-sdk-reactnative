/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import BigInt from 'big-integer';

import type { PropagatorType } from '../../../types';
import type { RegexMap } from '../requestProxy/interfaces/RequestProxy';

import { TracingIdentifier } from './TracingIdentifier';
import type { SpanId, TraceId } from './TracingIdentifier';
import type { Hostname } from './firstPartyHosts';
import { getPropagatorsForHost } from './firstPartyHosts';

const knuthFactor = BigInt('1111111111111111111');
const twoPow64 = BigInt('10000000000000000', 16); // 2n ** 64n

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
    // for a UUID with value aaaaaaaa-bbbb-Mccc-Nddd-1234567890ab
    // we use as the input id the last part : 0x1234567890ab
    const baseId = rumSessionId
        ? BigInt(rumSessionId.split('-')[4], 16)
        : traceId.id;
    const hash = Number(baseId.multiply(knuthFactor).remainder(twoPow64));
    const threshold = (tracingSamplingRate / 100) * Number(twoPow64);
    const isSampled = hash <= threshold;

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
