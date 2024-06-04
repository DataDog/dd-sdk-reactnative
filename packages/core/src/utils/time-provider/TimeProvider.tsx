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
    unix: number;
    // Result of performance.now API. Timestamp in ms (with microsecond precision)
    // since JS context start.
    reactNative: number | null;
};

/**
 * Simple class providing timestamps in milliseconds.
 * If available, it will use the `performance.now()` method, and will fallback on `Date.now()` otherwise.
 */
export abstract class TimeProvider {
    /** Keeps an average offset between the unix time and the provided timestamp. */
    protected baseOffset: number;

    constructor() {
        const timestamp = this.getTimestamp();
        if (timestamp.reactNative == null) {
            this.baseOffset = 0;
        } else {
            this.baseOffset = timestamp.unix - timestamp.reactNative;
        }
    }

    abstract getTimestamp(): Timestamp;

    now(): number {
        const timestamp = this.getTimestamp();

        if (timestamp.reactNative != null && this.baseOffset === 0) {
            this.baseOffset = timestamp.unix - timestamp.reactNative;
        }

        if (timestamp.reactNative == null || this.baseOffset === 0) {
            return timestamp.unix;
        } else {
            return this.baseOffset + timestamp.reactNative;
        }
    }
}
