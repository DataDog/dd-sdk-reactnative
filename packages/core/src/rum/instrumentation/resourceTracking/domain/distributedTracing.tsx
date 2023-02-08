/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { PropagatorType } from '../../../../DdSdkReactNativeConfiguration';

import type { Hostname } from './firstPartyHosts';
import { getPropagatorsForHost } from './firstPartyHosts';
import type { RegexMap } from './interfaces/RequestProxy';

export type DdRumResourceTracingAttributes =
    | {
          tracingStrategy: 'KEEP';
          traceId: TraceId;
          spanId: SpanId;
          samplingPriorityHeader: '1' | '0';
          rulePsr: number;
          propagators: PropagatorType[];
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
    propagators: PropagatorType[]
): DdRumResourceTracingAttributes => {
    const isSampled = Math.random() * 100 <= tracingSamplingRate;
    const tracingAttributes: DdRumResourceTracingAttributes = {
        traceId: new TraceIdentifier() as TraceId,
        spanId: new TraceIdentifier() as SpanId,
        samplingPriorityHeader: isSampled ? '1' : '0',
        tracingStrategy: 'KEEP',
        rulePsr: tracingSamplingRate / 100,
        propagators
    };

    return tracingAttributes;
};

/**
 * Using branded types will ensure we don't accidentally use
 * traceId for spanId when generating headers.
 */
export type TraceId = TraceIdentifier & {
    _brand: 'traceId';
};

export type SpanId = TraceIdentifier & {
    _brand: 'spanId';
};

/*
 * This code was inspired from browser-sdk at (https://github.com/DataDog/browser-sdk/blob/master/packages/rum-core/src/domain/tracing/tracer.ts#L107)
 */
const MAX_32_BITS_NUMBER = 4294967295; // 2^32-1
export class TraceIdentifier {
    private low: number;
    private high: number;

    constructor() {
        this.low = Math.floor(Math.random() * MAX_32_BITS_NUMBER);
        this.high = Math.floor(Math.random() * MAX_32_BITS_NUMBER);
    }

    toString = (radix: number) => {
        let low = this.low;
        let high = this.high;
        let str = '';

        while (high > 0 && low > 0) {
            // Create an intermediate value with the same modulo as the combined high and low value
            // but requiring 36 bits max (32 for the low value + 4 for the high part)
            const modH = high % radix;
            const temp = (modH << 32) + low;
            const digit = temp % radix;

            // update the high value
            high = (high - modH) / radix; // we reuse the modH to avoid the need of a floor op
            // the low value reuses the previous temp value to account for the "missing mod" in the high update
            low = (temp - digit) / radix; // we reuse the digit to avoid the need of a floor op

            // update the string from right to left
            str = digit.toString() + str;
        }
        return str;
    };

    toPaddedString = (radix: number, length: number) => {
        const traceId = this.toString(radix);
        if (traceId.length > length) {
            return traceId;
        }
        return Array(length - traceId.length + 1).join('0') + traceId;
    };
}
