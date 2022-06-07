/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { Platform } from 'react-native';

interface Timing {
    /**
     * Time relative (absolute in case of iOS) to some point, in ns.
     */
    startTime: number;
    /**
     * Duration in ns.
     */
    duration: number;
}

interface ResourceTimings {
    // unlike in Performance API it is not the time until request
    // starts (requestStart, before it can be connect, SSL, DNS),
    // but the time until the response is first seen
    firstByte: Timing;
    download: Timing;
    // required by iOS, total timing from the beginning to the end
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
    // needed for iOS, simply total duration from start to end
    const fetch = formatTiming(startTime, startTime, responseEndTime);

    return {
        firstByte,
        download,
        fetch
    };
}

/**
 * @param origin Start time (absolute) of the request
 * @param start Start time (absolute) of the timing
 * @param end End time (absolute) of the timing
 */
function formatTiming(origin: number, start: number, end: number): Timing {
    return {
        duration: timeToNanos(end - start),
        // if it is Android, startTime should be relative to the origin,
        // if it is iOS - absolute (unix timestamp)
        startTime:
            Platform.OS === 'ios'
                ? timeToNanos(start)
                : timeToNanos(start - origin)
    };
}

function timeToNanos(durationMs: number): number {
    return +(durationMs * 1e6).toFixed(0);
}
