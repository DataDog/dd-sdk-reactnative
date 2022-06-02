/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { Hostname } from '../implementation/firstPartyHostsRegex';
import { isHostFirstParty } from '../implementation/firstPartyHostsRegex';

export type DdRumResourceTracingAttributes =
    | {
          tracingStrategy: 'KEEP';
          traceId: string;
          spanId: string;
          samplingPriorityHeader: '1';
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
    firstPartyHostsRegex,
    tracingSamplingRate
}: {
    hostname: Hostname | null;
    firstPartyHostsRegex: RegExp;
    tracingSamplingRate: number;
}): DdRumResourceTracingAttributes => {
    if (hostname === null) {
        return DISCARDED_TRACE_ATTRIBUTES;
    }
    if (isHostFirstParty(hostname, firstPartyHostsRegex)) {
        return generateTracingAttributesWithSampling(tracingSamplingRate);
    }
    return DISCARDED_TRACE_ATTRIBUTES;
};

const generateTracingAttributesWithSampling = (
    tracingSamplingRate: number
): DdRumResourceTracingAttributes => {
    if (Math.random() * 100 <= tracingSamplingRate) {
        return {
            traceId: generateTraceId(),
            spanId: generateTraceId(),
            samplingPriorityHeader: '1',
            tracingStrategy: 'KEEP'
        };
    }
    return DISCARDED_TRACE_ATTRIBUTES;
};

/*
 * This code was inspired from browser-sdk at (https://github.com/DataDog/browser-sdk/blob/master/packages/rum-core/src/domain/tracing/tracer.ts#L107)
 */
export function generateTraceId(): string {
    const radix = 10;
    const MAX_32_BITS_NUMBER = 4294967295; // 2^32-1
    let low: number = Math.floor(Math.random() * MAX_32_BITS_NUMBER);
    let high: number = Math.floor(Math.random() * MAX_32_BITS_NUMBER);
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
}
