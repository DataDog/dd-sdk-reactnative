/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { MockTimeProvider } from '../../rum/__mocks__/MockTimeProvider';
import { DefaultTimeProvider } from '../time-provider/DefaultTimeProvider';

function mockDateNow(value: number) {
    Date.now = (): number => {
        return value;
    };
}

function mockPerformanceNow(value: number = 0) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.performance = {
        now: (): number => {
            return value;
        }
    };
}

function randomInt(): number {
    return Math.floor(Math.random() * 65536) + 512;
}

let dateTime: number;
let perfTime: number;

beforeEach(() => {
    dateTime = randomInt();
    perfTime = randomInt();
    mockDateNow(dateTime);
    mockPerformanceNow(perfTime);
});

it('M use performance W available', () => {
    // GIVEN
    const timeProvider = new DefaultTimeProvider();

    // WHEN
    const result = timeProvider.getTimestamp();

    // THEN
    expect(result.unix).toBe(dateTime);
    expect(result.reactNative).toBe(perfTime);
});

it('M use unix time W reactNative time unavailable', () => {
    // GIVEN
    const timeProvider = new MockTimeProvider(1000, null);

    // WHEN
    const now = timeProvider.now();
    const timestamp = timeProvider.getTimestamp();

    // THEN
    expect(timestamp.unix).toBe(1000);
    expect(timestamp.reactNative).toBe(null);
    expect(now).toBe(1000);
});

it('M keep the offset W unix time drifts within the tolerance', () => {
    // GIVEN
    const timeProvider = new MockTimeProvider(1000, 100);
    timeProvider.now();

    // WHEN
    timeProvider.unixMockedTime = 2000 + 999;
    timeProvider.reactNativeMockedTime = 1100.5;
    const now = timeProvider.now();

    // THEN
    expect(now).toBe(2000.5);
});

it('M re-sync the offset W unix time moves forward beyond the tolerance', () => {
    // GIVEN
    const timeProvider = new MockTimeProvider(1000, 100);
    timeProvider.now();

    // WHEN
    const clockChangeMs = 20 * 60 * 1000;
    timeProvider.unixMockedTime = 2000 + clockChangeMs;
    timeProvider.reactNativeMockedTime = 1100;
    const now = timeProvider.now();

    timeProvider.unixMockedTime = 2010 + clockChangeMs;
    timeProvider.reactNativeMockedTime = 1110.5;
    const nextNow = timeProvider.now();

    // THEN
    expect(now).toBe(2000 + clockChangeMs);
    expect(nextNow).toBe(2010.5 + clockChangeMs);
});

it('M re-sync the offset W unix time moves backward beyond the tolerance', () => {
    // GIVEN
    const timeProvider = new MockTimeProvider(1_000_000_000, 100);
    timeProvider.now();

    // WHEN
    const clockChangeMs = -20 * 60 * 1000;
    timeProvider.unixMockedTime = 1_000_001_000 + clockChangeMs;
    timeProvider.reactNativeMockedTime = 1100;
    const now = timeProvider.now();

    // THEN
    expect(now).toBe(1_000_001_000 + clockChangeMs);
});

it('M ignore performance W global.performance unavailable', () => {
    // GIVEN
    // @ts-expect-error performance is not supposed to be null, but we treat it as such for testing purposes
    delete global.performance;
    const timeProvider = new DefaultTimeProvider();

    // WHEN
    const result = timeProvider.getTimestamp();

    // THEN
    expect(result.unix).toBe(dateTime);
    expect(result.reactNative).toBe(null);
});

it('M ignore performance W unavailable', () => {
    // GIVEN
    // @ts-expect-error performance.now is not supposed to be null, but we treat it as such for testing purposes
    delete global.performance.now;
    const timeProvider = new DefaultTimeProvider();

    // WHEN
    const result = timeProvider.getTimestamp();

    // THEN
    expect(result.unix).toBe(dateTime);
    expect(result.reactNative).toBe(null);
});
