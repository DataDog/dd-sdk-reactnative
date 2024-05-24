/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Timer from '../Timer';

function randomInt(): number {
    return Math.floor(Math.random() * 65536) + 512;
}
const mockTimeProvider = {
    getTimestamp: jest.fn()
};

beforeEach(() => {
    mockTimeProvider.getTimestamp.mockClear();
});

it('M use performance W available', () => {
    // GIVEN
    const expectedDuration = randomInt();
    mockTimeProvider.getTimestamp
        .mockReturnValueOnce({ unix: 5.0, react_native: 7.0 })
        .mockReturnValueOnce({
            unix: 6.0,
            react_native: 7.0 + expectedDuration
        });

    // @ts-expect-error mockTimeProvider does not mock all the TimeProvider public methods
    const timer = new Timer(mockTimeProvider);

    // WHEN
    timer.start();
    timer.stop();

    // THEN
    expect(timer.startTime).toBe(5.0);
    expect(timer.stopTime).toBe(5.0 + expectedDuration);
});

it('M use Date W performance data is never available', () => {
    // GIVEN
    const expectedDuration = randomInt();
    mockTimeProvider.getTimestamp
        .mockReturnValueOnce({ unix: 5.0, react_native: null })
        .mockReturnValueOnce({
            unix: 5.0 + expectedDuration,
            react_native: null
        });

    // @ts-expect-error mockTimeProvider does not mock all the TimeProvider public methods
    const timer = new Timer(mockTimeProvider);

    // WHEN
    timer.start();
    timer.stop();

    // THEN
    expect(timer.startTime).toBe(5.0);
    expect(timer.stopTime).toBe(5.0 + expectedDuration);
});

it('M use Date W performance data is not available on start', () => {
    // GIVEN
    const expectedDuration = randomInt();
    mockTimeProvider.getTimestamp
        .mockReturnValueOnce({ unix: 5.0, react_native: null })
        .mockReturnValueOnce({
            unix: 5.0 + expectedDuration,
            react_native: 13.0
        });

    // @ts-expect-error mockTimeProvider does not mock all the TimeProvider public methods
    const timer = new Timer(mockTimeProvider);

    // WHEN
    timer.start();
    timer.stop();

    // THEN
    expect(timer.startTime).toBe(5.0);
    expect(timer.stopTime).toBe(5.0 + expectedDuration);
});

it('M use Date W performance data is not available on stop', () => {
    // GIVEN
    const expectedDuration = randomInt();
    mockTimeProvider.getTimestamp
        .mockReturnValueOnce({ unix: 5.0, react_native: 13.0 })
        .mockReturnValueOnce({
            unix: 5.0 + expectedDuration,
            react_native: null
        });

    // @ts-expect-error mockTimeProvider does not mock all the TimeProvider public methods
    const timer = new Timer(mockTimeProvider);

    // WHEN
    timer.start();
    timer.stop();

    // THEN
    expect(timer.startTime).toBe(5.0);
    expect(timer.stopTime).toBe(5.0 + expectedDuration);
});

it('M return duration between two ticks W performance is available', () => {
    // GIVEN
    const expectedDuration1 = randomInt();
    const expectedDuration2 = randomInt();
    const expectedDuration3 = randomInt();
    mockTimeProvider.getTimestamp
        .mockReturnValueOnce({ unix: 5.0, react_native: 13.0 })
        .mockReturnValueOnce({
            unix: 6.0,
            react_native: 13.0 + expectedDuration1
        })
        .mockReturnValueOnce({
            unix: 6.0,
            react_native: 13.0 + expectedDuration1 + expectedDuration2
        })
        .mockReturnValueOnce({
            unix: 6.0,
            react_native:
                13.0 + expectedDuration1 + expectedDuration2 + expectedDuration3
        });

    // @ts-expect-error mockTimeProvider does not mock all the TimeProvider public methods
    const timer = new Timer(mockTimeProvider);

    // WHEN
    timer.start();
    timer.recordTick('first');
    timer.recordTick('second');
    timer.stop();

    // THEN
    expect(timer.startTime).toBe(5.0);
    expect(timer.durationBetween('first', 'second')).toBe(expectedDuration2);
    expect(timer.stopTime).toBe(
        5 + expectedDuration1 + expectedDuration2 + expectedDuration3
    );
});

it('M return duration between two ticks W performance is not available', () => {
    // GIVEN
    const expectedDuration1 = randomInt();
    const expectedDuration2 = randomInt();
    const expectedDuration3 = randomInt();
    mockTimeProvider.getTimestamp
        .mockReturnValueOnce({ unix: 5.0, react_native: null })
        .mockReturnValueOnce({
            unix: 5.0 + expectedDuration1,
            react_native: null
        })
        .mockReturnValueOnce({
            unix: 5.0 + expectedDuration1 + expectedDuration2,
            react_native: null
        })
        .mockReturnValueOnce({
            unix:
                5.0 + expectedDuration1 + expectedDuration2 + expectedDuration3,
            react_native: null
        });

    // @ts-expect-error mockTimeProvider does not mock all the TimeProvider public methods
    const timer = new Timer(mockTimeProvider);

    // WHEN
    timer.start();
    timer.recordTick('first');
    timer.recordTick('second');
    timer.stop();

    // THEN
    expect(timer.startTime).toBe(5.0);
    expect(timer.durationBetween('first', 'second')).toBe(expectedDuration2);
    expect(timer.stopTime).toBe(
        5 + expectedDuration1 + expectedDuration2 + expectedDuration3
    );
});

it('M record tick labels', () => {
    // GIVEN
    const timer = new Timer();

    // WHEN
    timer.start();
    timer.recordTick('first');
    timer.stop();

    // THEN
    expect(timer.hasTickFor('first')).toBe(true);
    expect(timer.hasTickFor('second')).toBe(false);
});

it('M return time for tick W performance is available', () => {
    // GIVEN
    const expectedDuration1 = randomInt();
    const expectedDuration2 = randomInt();

    mockTimeProvider.getTimestamp
        .mockReturnValueOnce({ unix: 5.0, react_native: 13.0 })
        .mockReturnValueOnce({
            unix: 6.0,
            react_native: 13.0 + expectedDuration1
        })
        .mockReturnValueOnce({
            unix: 6.0,
            react_native: 13.0 + expectedDuration1 + expectedDuration2
        });

    // @ts-expect-error mockTimeProvider does not mock all the TimeProvider public methods
    const timer = new Timer(mockTimeProvider);

    // WHEN
    timer.start();
    timer.recordTick('first');
    timer.stop();

    // THEN
    expect(timer.timeAt('first')).toBe(5.0 + expectedDuration1);
});

it('M return time for tick W performance is not available', () => {
    // GIVEN
    const expectedDuration1 = randomInt();
    const expectedDuration2 = randomInt();

    mockTimeProvider.getTimestamp
        .mockReturnValueOnce({ unix: 5.0, react_native: null })
        .mockReturnValueOnce({
            unix: 5.0 + expectedDuration1,
            react_native: null
        })
        .mockReturnValueOnce({
            unix: 5.0 + expectedDuration1 + expectedDuration2,
            react_native: null
        });

    // @ts-expect-error mockTimeProvider does not mock all the TimeProvider public methods
    const timer = new Timer(mockTimeProvider);

    // WHEN
    timer.start();
    timer.recordTick('first');
    timer.stop();

    // THEN
    expect(timer.timeAt('first')).toBe(5.0 + expectedDuration1);
});
