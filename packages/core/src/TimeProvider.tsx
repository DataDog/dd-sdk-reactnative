/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * A Timestamp structure holding the
 */
export type Timestamp = {
    // Result of Date API. Unix timestamp in ms.
    unix: number,
    // Result of performance.now API. Timestamp in ms (with microsecond precision)
    // since JS context start.
    react_native: number | null
}

/**
 * Simple class providing timestamps in milliseconds.
 * If available, it will use the `performance.now()` method, and will fallback on `Date.now()` otherwise.
 */
export class TimeProvider {

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    private canUsePerformanceNow = global.performance && typeof performance.now === 'function';

    /** Keeps an average offset between the unix time and the provided timestamp. */
    private baseOffset: number

    constructor() {
        const timestamp = this.getTimestamp();
        if (timestamp.react_native == null) {
            this.baseOffset = 0;
        } else {
            this.baseOffset = timestamp.unix - timestamp.react_native;
        }
    }

    getTimestamp(): Timestamp {
        return {
            unix: Date.now(),
            react_native: this.performanceNow()
        }
    }

    now(): number {
        const timestamp = this.getTimestamp();
        if (timestamp.react_native == null) {
            return timestamp.unix
        } else {
            return this.baseOffset + timestamp.react_native;
        }
    }

    private performanceNow(): number | null {
        if (this.canUsePerformanceNow) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return performance.now();
        }
        return null;
    }
}