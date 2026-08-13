/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { Platform } from 'react-native';

interface Timing {
    startTime: number;
    duration: number;
}

interface ResourceTimings {
    firstByte: Timing;
    download: Timing;
    fetch: Timing;
}

export function createTimings(
    startTime: number,
    responseStartTime: number,
    responseEndTime: number
): ResourceTimings {
    const firstByte = formatTiming(startTime, startTime, responseStartTime);
    const download = formatTiming(
        startTime,
        responseStartTime,
        responseEndTime
    );
    const fetch = formatTiming(startTime, startTime, responseEndTime);

    return {
        firstByte,
        download,
        fetch
    };
}

function formatTiming(origin: number, start: number, end: number): Timing {
    return {
        duration: timeToNanos(end - start),
        startTime:
            Platform.OS === 'ios'
                ? timeToNanos(start)
                : timeToNanos(start - origin)
    };
}

function timeToNanos(durationMs: number): number {
    return +(durationMs * 1e6).toFixed(0);
}
