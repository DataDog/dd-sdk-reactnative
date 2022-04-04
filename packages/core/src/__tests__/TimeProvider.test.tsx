/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { TimeProvider } from '../TimeProvider'


function mockDateNow(value: number){
    Date.now = (): number => {
        return value;
    }
}

function mockPerformanceNow(value: number = 0){
    // @ts-ignore
    global.performance = {
        now: (): number => {
            return value;
        }
    }
}

function randomInt(): number {
    return Math.floor(Math.random() * 65536) + 512
}

let dateTime: number
let perfTime: number

beforeEach(() => {
    dateTime = randomInt();
    perfTime = randomInt();
    mockDateNow(dateTime);
    mockPerformanceNow(perfTime);
})

it('M use performance W available', () => {
    // GIVEN
    const timeProvider = new TimeProvider();

    // WHEN
    const result = timeProvider.getTimestamp();

    // THEN
    expect(result.unix).toBe(dateTime);
    expect(result.react_native).toBe(perfTime);
})

it('M ignore performance W global.performance unavailable', () => {
    // GIVEN
    delete global.performance;
    const timeProvider = new TimeProvider();

    // WHEN
    const result = timeProvider.getTimestamp();

    // THEN
    expect(result.unix).toBe(dateTime);
    expect(result.react_native).toBe(null);
})

it('M ignore performance W unavailable', () => {
    // GIVEN
    delete global.performance.now;
    const timeProvider = new TimeProvider();

    // WHEN
    const result = timeProvider.getTimestamp();

    // THEN
    expect(result.unix).toBe(dateTime);
    expect(result.react_native).toBe(null);
})