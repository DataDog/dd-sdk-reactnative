/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0. This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import BigInt from 'big-integer';

import { getGlobalInstance } from '../../../../utils/singletonUtils';

import { MAX_TRACE_ID } from './TracingIdentifier';
import type { TraceId } from './TracingIdentifier';

const KNUTH_FACTOR = BigInt('1111111111111111111');

const DISTRIBUTED_TRACING_SAMPLING_MODULE =
    'com.datadog.reactnative.rum.distributed_tracing_sampling';

class _DistributedTracingSampling {
    private _maxSampledTraceId: BigInt.BigInteger | null = null;

    get maxSampledTraceId(): BigInt.BigInteger {
        return this._maxSampledTraceId ?? BigInt(0);
    }

    setResourceTraceSampleRate(resourceTraceSampleRate: number) {
        this._maxSampledTraceId = _DistributedTracingSampling.getMaxTraceId(
            resourceTraceSampleRate
        );
    }

    shouldSampleTrace(
        tracingSamplingRate: number,
        sessionId: string | null | undefined,
        traceId: TraceId
    ): boolean {
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
            .lesser(this.maxSampledTraceId);
    }

    private static getMaxTraceId(sampleRate: number): BigInt.BigInteger {
        return BigInt(MAX_TRACE_ID.toJSNumber() * (sampleRate / 100.0));
    }
}

export const DistributedTracingSampling = getGlobalInstance(
    DISTRIBUTED_TRACING_SAMPLING_MODULE,
    () => new _DistributedTracingSampling()
);
