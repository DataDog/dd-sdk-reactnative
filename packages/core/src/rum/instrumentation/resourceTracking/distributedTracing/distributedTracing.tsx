/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { PropagatorType } from '../../../types';
import type { RegexMap } from '../requestProxy/interfaces/RequestProxy';

import { TracingIdentifier } from './TracingIdentifier';
import type { DdRumResourceTracingAttributes } from './distributedTracingAttributes';
import { DistributedTracingSampling } from './distributedTracingSampling';
import type { Hostname } from './firstPartyHosts';
import { getPropagatorsForHost } from './firstPartyHosts';

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

    const isSampled = DistributedTracingSampling.shouldSampleTrace(
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
