/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { Platform } from 'react-native';

import { DdSdkReactNative } from '../../DdSdkReactNative';
import type { FlagsEvaluationContext, FlagValue } from '../../DdSdkReactNative';
import { evaluate, unwrapConfiguration } from '../js-evaluator';
import type {
    FlagValueType,
    JsonValue,
    UniversalFlagConfigurationResponse
} from '../js-evaluator';

import benchmarkContexts from './contexts-200.json';
import ufcMaxcomplex2500 from './ufc-maxcomplex-2500.json';

type VariationType = 'BOOLEAN' | 'STRING' | 'INTEGER' | 'NUMERIC' | 'JSON';

type BenchmarkFlagSpec = {
    key: string;
    variationType: VariationType;
    defaultValue: FlagValue;
};

type BenchmarkStats = {
    evalTotalMs: number;
    perEvalUs: number;
    p50Us: number;
    p95Us: number;
    p99Us: number;
};

export type FfeBenchmarkMeasurement = BenchmarkStats & {
    measurement: 'js-in-process' | 'native-compute-only' | 'native-as-consumed';
    checksum: string;
};

export type FfeBenchmarkReport = {
    platform: 'ios' | 'android' | 'unknown';
    deviceKind: 'physical' | 'simulator' | 'emulator' | 'unknown';
    rnArchitecture: 'old' | 'new' | 'unknown';
    build: 'debug' | 'release' | 'unknown';
    runtime: 'hermes' | 'jsc' | 'unknown';
    config: 'ufc-maxcomplex-2500';
    flags: number;
    contexts: number;
    iterations: number;
    parseMs: number;
    parity: 'passed' | 'failed';
    measurements: FfeBenchmarkMeasurement[];
};

type NativeBenchmarkResult = BenchmarkStats & {
    iterations: number;
    checksum: string;
};

const BENCHMARK_CONFIG =
    ufcMaxcomplex2500 as unknown as UniversalFlagConfigurationResponse;
const BENCHMARK_CONTEXTS = benchmarkContexts as FlagsEvaluationContext[];
const BENCHMARK_FLAGS = flagSpecs();
const BENCHMARK_EVALUATION_TIME_MS = Date.parse('2026-07-01T12:00:00.000Z');
const BENCHMARK_WIRE = JSON.stringify({
    version: 2,
    server: {
        response: JSON.stringify(ufcMaxcomplex2500),
        etag: 'ufc-maxcomplex-2500'
    }
});

export async function runFfeJsVsNativeBenchmark(
    options: {
        deviceKind?: FfeBenchmarkReport['deviceKind'];
        rnArchitecture?: FfeBenchmarkReport['rnArchitecture'];
        build?: FfeBenchmarkReport['build'];
    } = {}
): Promise<FfeBenchmarkReport> {
    const jsMeasurement = runJsBenchmark();

    const parseStart = nowMs();
    const nativeConfiguration = await DdSdkReactNative.configurationFromString(
        BENCHMARK_WIRE
    );
    await DdSdkReactNative.setConfiguration(nativeConfiguration);
    const parseMs = nowMs() - parseStart;

    const nativeWallStart = nowMs();
    const nativeResult = (await DdSdkReactNative.runNativeFfeBenchmark({
        contexts: BENCHMARK_CONTEXTS,
        flags: BENCHMARK_FLAGS,
        evaluationTimeMs: BENCHMARK_EVALUATION_TIME_MS
    })) as NativeBenchmarkResult;
    const nativeWallMs = nowMs() - nativeWallStart;

    const nativeComputeMeasurement: FfeBenchmarkMeasurement = {
        measurement: 'native-compute-only',
        checksum: nativeResult.checksum,
        evalTotalMs: nativeResult.evalTotalMs,
        perEvalUs: nativeResult.perEvalUs,
        p50Us: nativeResult.p50Us,
        p95Us: nativeResult.p95Us,
        p99Us: nativeResult.p99Us
    };

    const nativeAsConsumedMeasurement: FfeBenchmarkMeasurement = {
        ...nativeComputeMeasurement,
        measurement: 'native-as-consumed',
        evalTotalMs: nativeWallMs,
        perEvalUs: (nativeWallMs * 1000) / nativeResult.iterations
    };

    return {
        platform: platformName(),
        deviceKind: options.deviceKind ?? 'unknown',
        rnArchitecture: options.rnArchitecture ?? 'unknown',
        build: options.build ?? 'unknown',
        runtime: runtimeName(),
        config: 'ufc-maxcomplex-2500',
        flags: BENCHMARK_FLAGS.length,
        contexts: BENCHMARK_CONTEXTS.length,
        iterations: nativeResult.iterations,
        parseMs,
        parity:
            jsMeasurement.checksum === nativeResult.checksum
                ? 'passed'
                : 'failed',
        measurements: [
            jsMeasurement,
            nativeComputeMeasurement,
            nativeAsConsumedMeasurement
        ]
    };
}

export function runJsBenchmark(): FfeBenchmarkMeasurement {
    const batchDurationsUs: number[] = [];
    let checksum = FNV_OFFSET_BASIS;
    let iterations = 0;
    const start = nowMs();

    for (const context of BENCHMARK_CONTEXTS) {
        const batchStart = nowMs();
        for (const flag of BENCHMARK_FLAGS) {
            const result = evaluate(
                BENCHMARK_CONFIG,
                flagType(flag.variationType),
                flag.key,
                flag.defaultValue as JsonValue,
                context,
                { nowMs: BENCHMARK_EVALUATION_TIME_MS }
            );
            checksum = checksumResult(checksum, flag.key, result);
            iterations += 1;
        }
        batchDurationsUs.push(
            ((nowMs() - batchStart) * 1000) / BENCHMARK_FLAGS.length
        );
    }

    const evalTotalMs = nowMs() - start;
    return {
        measurement: 'js-in-process',
        checksum: checksumHex(checksum),
        evalTotalMs,
        perEvalUs: (evalTotalMs * 1000) / iterations,
        p50Us: percentile(batchDurationsUs, 0.5),
        p95Us: percentile(batchDurationsUs, 0.95),
        p99Us: percentile(batchDurationsUs, 0.99)
    };
}

function flagSpecs(): BenchmarkFlagSpec[] {
    const config = unwrapConfiguration(BENCHMARK_CONFIG);
    if (!config) {
        return [];
    }
    return Object.values(config.flags).map(flag => ({
        key: flag.key,
        variationType: flag.variationType,
        defaultValue: defaultValue(flag.variationType)
    }));
}

function defaultValue(variationType: VariationType): FlagValue {
    switch (variationType) {
        case 'BOOLEAN':
            return false;
        case 'STRING':
            return '';
        case 'INTEGER':
        case 'NUMERIC':
            return 0;
        case 'JSON':
            return {};
    }
}

function flagType(variationType: VariationType): FlagValueType {
    switch (variationType) {
        case 'BOOLEAN':
            return 'boolean';
        case 'STRING':
            return 'string';
        case 'INTEGER':
        case 'NUMERIC':
            return 'number';
        case 'JSON':
            return 'object';
    }
}

function platformName(): FfeBenchmarkReport['platform'] {
    return Platform.OS === 'ios' || Platform.OS === 'android'
        ? Platform.OS
        : 'unknown';
}

function runtimeName(): FfeBenchmarkReport['runtime'] {
    return (globalThis as { HermesInternal?: unknown }).HermesInternal
        ? 'hermes'
        : 'unknown';
}

function nowMs(): number {
    return global.performance?.now?.() ?? Date.now();
}

function percentile(values: number[], quantile: number): number {
    if (values.length === 0) {
        return 0;
    }
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * quantile))];
}

const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

function checksumResult(
    checksum: number,
    flagKey: string,
    result: {
        value: JsonValue;
        variant?: string;
        reason: string;
        errorCode?: string;
    }
): number {
    return updateChecksum(
        checksum,
        [
            flagKey,
            canonicalValue(result.value),
            result.variant ?? '',
            result.reason,
            result.errorCode ?? ''
        ].join('|')
    );
}

function updateChecksum(checksum: number, value: string): number {
    let hash = checksum >>> 0;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, FNV_PRIME) >>> 0;
    }
    return hash;
}

function checksumHex(checksum: number): string {
    return (checksum >>> 0).toString(16).padStart(8, '0');
}

function canonicalValue(value: unknown): string {
    if (value === null || value === undefined) {
        return 'null';
    }
    if (Array.isArray(value)) {
        return `[${value.map(canonicalValue).join(',')}]`;
    }
    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record)
            .sort()
            .map(key => `${JSON.stringify(key)}:${canonicalValue(record[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}
