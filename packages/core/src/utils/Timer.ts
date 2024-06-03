/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DefaultTimeProvider } from './time-provider/DefaultTimeProvider';
import type { TimeProvider, Timestamp } from './time-provider/TimeProvider';

const START_LABEL = '__start';
const STOP_LABEL = '__stop';

/**
 * Simple timer which records time ticks. Shouldn't be re-used once stopped.
 * All timestamps/durations returned are in milliseconds.
 */
export default class Timer {
    private timeProvider: TimeProvider;
    private times: Record<string, Timestamp> = {};

    constructor(timeProvider: TimeProvider = new DefaultTimeProvider()) {
        this.timeProvider = timeProvider;
    }

    get startTime(): number {
        return this.times[START_LABEL].unix;
    }

    get stopTime(): number {
        return this.startTime + this.durationBetween(START_LABEL, STOP_LABEL);
    }

    start(): void {
        this.recordTick(START_LABEL);
    }

    stop(): void {
        this.recordTick(STOP_LABEL);
    }

    recordTick(label: string): void {
        this.times[label] = this.timeProvider.getTimestamp();
    }

    hasTickFor(label: string): boolean {
        return label in this.times;
    }

    durationBetween(startLabel: string, endLabel: string): number {
        this.checkLabelExists(startLabel);
        this.checkLabelExists(endLabel);

        const startTick = this.times[startLabel];
        const endTick = this.times[endLabel];

        return this.durationBetweenTicks(startTick, endTick);
    }

    timeAt(label: string): number {
        this.checkLabelExists(label);

        return this.startTime + this.durationBetween(START_LABEL, label);
    }

    reset(): void {
        this.times = {};
    }

    private durationBetweenTicks(start: Timestamp, end: Timestamp): number {
        if (start.reactNative != null && end.reactNative != null) {
            return end.reactNative - start.reactNative;
        }
        return end.unix - start.unix;
    }

    private checkLabelExists(label: string) {
        if (!this.hasTickFor(label)) {
            throw new Error(`Label ${label} is not registered`);
        }
    }
}
