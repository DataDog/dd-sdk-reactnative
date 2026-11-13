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

const clampRate = (rate: number): number => Math.min(Math.max(rate, 0), 100);

class _DistributedTracingSampling {
    private _sessionSampleRate: number = 100;

    get sessionSampleRate(): number {
        return this._sessionSampleRate;
    }

    /**
     * Sets the RUM session sample rate the trace sampling decision is rebased on.
     * Defaults to 100 (no rebasing) until the RUM configuration is known.
     * Applies to resource tracking and to the manual tracing context APIs.
     */
    setSessionSampleRate(sessionSampleRate: number) {
        this._sessionSampleRate = clampRate(sessionSampleRate);
    }

    shouldSampleTrace(
        tracingSamplingRate: number,
        sessionId: string | null | undefined,
        traceId: TraceId
    ): boolean {
        if (tracingSamplingRate <= 0) {
            return false;
        }

        // Offer consistent sampling for the same trace id across different environments. The rule is:
        //
        //   (identifier * knuthFactor) < max_trace_id
        //
        // With a RUM session, the decision uses the low 48 bits of the session id and is rebased
        // onto the session: a session's traces are sampled at sessionSampleRate x traceSampleRate,
        // as the iOS and Android SDKs do, so traced sessions are always sampled-in RUM sessions.
        const sessionLowBits = _DistributedTracingSampling.getSessionLowBits(
            sessionId
        );
        if (sessionLowBits !== null) {
            const combinedSampleRate =
                this._sessionSampleRate *
                (clampRate(tracingSamplingRate) / 100.0);
            if (combinedSampleRate >= 100) {
                return true;
            }
            return _DistributedTracingSampling.isSampled(
                sessionLowBits,
                _DistributedTracingSampling.getMaxTraceId(combinedSampleRate)
            );
        }

        // Without a session, the decision uses the low bits of the trace id at traceSampleRate.
        if (tracingSamplingRate >= 100) {
            return true;
        }
        return _DistributedTracingSampling.isSampled(
            traceId.id.and(MAX_TRACE_ID),
            _DistributedTracingSampling.getMaxTraceId(tracingSamplingRate)
        );
    }

    private static getSessionLowBits(
        sessionId: string | null | undefined
    ): BigInt.BigInteger | null {
        if (sessionId == null) {
            return null;
        }
        const uuidParts = sessionId.split('-');
        if (uuidParts.length !== 5) {
            return null;
        }
        try {
            // Parse last UUID part as hex into bigint
            return BigInt(`${uuidParts[4]}`, 16);
        } catch {
            return null;
        }
    }

    private static isSampled(
        lowBits: BigInt.BigInteger,
        maxSampledId: BigInt.BigInteger
    ): boolean {
        return lowBits
            .multiply(KNUTH_FACTOR)
            .and(MAX_TRACE_ID)
            .lesser(maxSampledId);
    }

    private static getMaxTraceId(sampleRate: number): BigInt.BigInteger {
        // big-integer throws on non-integer numbers, which low rates (e.g. a 1% session rate
        // x a 1% trace rate) produce once the product drops below 2^53.
        return BigInt(
            Math.floor(MAX_TRACE_ID.toJSNumber() * (sampleRate / 100.0))
        );
    }
}

export const DistributedTracingSampling = getGlobalInstance(
    DISTRIBUTED_TRACING_SAMPLING_MODULE,
    () => new _DistributedTracingSampling()
);
