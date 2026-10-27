/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Do not import this Spec directly, use DdNativeTraceType instead.
 */
export interface Spec extends TurboModule {
    readonly getConstants: () => {};

    /**
     * Start a span, and returns a unique identifier for the span.
     * @param operation: The operation name of the span.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the operation started (in milliseconds). If not provided, current timestamp will be used.
     */
    startSpan(
        operation: string,
        context: Object,
        timestampMs: number
    ): Promise<string>;

    /**
     * Finish a started span.
     * @param spanId: The unique identifier of the span.
     * @param context: The additional context to send.
     * @param timestampMs: The timestamp when the operation stopped (in milliseconds). If not provided, current timestamp will be used.
     */
    finishSpan(
        spanId: string,
        context: Object,
        timestampMs: number
    ): Promise<void>;
}

let cachedModule: Spec | null = null;

/**
 * Lazily resolves the native TurboModule on first call and caches it once found.
 * A missing module is not cached, so later calls retry the lookup.
 * Resolving lazily (instead of at module load) keeps this package importable on
 * platforms where the native module is absent (e.g. Vega).
 */
export const getNativeDdTrace = (): Spec | null => {
    if (!cachedModule) {
        cachedModule = TurboModuleRegistry.get<Spec>('DdTrace');
    }
    return cachedModule;
};
