/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Timer from '../Timer'

beforeEach(() => {
    let performanceNowTime = 0;

    // @ts-ignore
    global.performance = {
        now: (): number => {
            const now = performanceNowTime;
            performanceNowTime += 6;
            return now;
        }

    }
    // step is different for performance and Date just to differentiate results
    // in order to understand which one was used under the hood
    let dateNowTime = 1000;
    Date.now = (): number => {
        const now = dateNowTime;
        dateNowTime += 5;
        return now;
    }
})

it('M use performance W available', () => {
    // GIVEN
    const timer = new Timer();

    // WHEN
    timer.start();
    timer.stop();

    // THEN
    expect(timer.startTime).toBe(1000);
    expect(timer.stopTime).toBe(1006);
})

it('M use Date W performance object is not available', () => {
    // GIVEN
    const timer = new Timer();
    delete global.performance;

    // WHEN
    timer.start();
    timer.stop();

    // THEN
    expect(timer.startTime).toBe(1000);
    expect(timer.stopTime).toBe(1005);
})

it('M use Date W performance.now function is not available', () => {
    // GIVEN
    const timer = new Timer();
    delete global.performance.now;

    // WHEN
    timer.start();
    timer.stop();

    // THEN
    expect(timer.startTime).toBe(1000);
    expect(timer.stopTime).toBe(1005);
})

it('M return duration between two ticks W performance is available', () => {
    // GIVEN
    const timer = new Timer();

    // WHEN
    timer.start();
    timer.recordTick('first');
    timer.recordTick('second');
    timer.stop();

    // THEN
    expect(timer.startTime).toBe(1000);
    expect(timer.durationBetween('first', 'second')).toBe(6);
    expect(timer.stopTime).toBe(1018);
})

it('M return duration between two ticks W performance is not available', () => {
    // GIVEN
    const timer = new Timer();
    delete global.performance

    // WHEN
    timer.start();
    timer.recordTick('first');
    timer.recordTick('second');
    timer.stop();

    // THEN
    expect(timer.startTime).toBe(1000);
    expect(timer.durationBetween('first', 'second')).toBe(5);
    expect(timer.stopTime).toBe(1015);
})

it('M record tick labels', () => {
    // GIVEN
    const timer = new Timer();
    delete global.performance;

    // WHEN
    timer.start();
    timer.recordTick('first');
    timer.stop();

    // THEN
    expect(timer.hasTickFor('first')).toBe(true);
    expect(timer.hasTickFor('second')).toBe(false);
})

it('M return time for tick W performance is available', () => {
    // GIVEN
    const timer = new Timer();

    // WHEN
    timer.start();
    timer.recordTick('first');
    timer.stop();

    // THEN
    expect(timer.timeAt('first')).toBe(1006);
})

it('M return time for tick W performance is not available', () => {
    // GIVEN
    const timer = new Timer();
    delete global.performance;

    // WHEN
    timer.start();
    timer.recordTick('first');
    timer.stop();

    // THEN
    expect(timer.timeAt('first')).toBe(1005);
})
