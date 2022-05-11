/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { Platform, NativeModules } from 'react-native';

import { InternalLog } from '../../../InternalLog';
import { SdkVerbosity } from '../../../SdkVerbosity';
import {
    DdRumResourceTracking,
    PARENT_ID_HEADER_KEY,
    TRACE_ID_HEADER_KEY,
    ORIGIN_RUM,
    ORIGIN_HEADER_KEY,
    SAMPLING_PRIORITY_HEADER_KEY,
    SAMPLED_HEADER_KEY,
    calculateResponseSize,
    RESOURCE_SIZE_ERROR_MESSAGE
} from '../../../rum/instrumentation/DdRumResourceTracking';

import { XMLHttpRequestMock } from './__utils__/XMLHttpRequestMock';

jest.useFakeTimers();

jest.mock('../../../InternalLog', () => {
    return {
        InternalLog: {
            log: jest.fn()
        }
    };
});

const DdRum = NativeModules.DdRum;

function randomInt(max: number): number {
    return Math.floor(Math.random() * max);
}

const flushPromises = () => new Promise(setImmediate);

beforeEach(() => {
    DdRum.startResource.mockClear();
    DdRum.stopResource.mockClear();

    // we need this because with ms precision between Date.now() calls we can get 0, so we advance
    // it manually with each call
    let now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => {
        now += 5;
        return now;
    });

    jest.setTimeout(20000);
});

afterEach(() => {
    DdRumResourceTracking.stopTracking();
    Date.now.mockClear();
});

it('M intercept XHR request W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    const method = 'GET';
    const url = 'https://api.example.com/v2/user';
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

    // WHEN
    const xhr = new XMLHttpRequestMock();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    expect(DdRum.startResource.mock.calls.length).toBe(1);
    expect(DdRum.startResource.mock.calls[0][1]).toBe(method);
    expect(DdRum.startResource.mock.calls[0][2]).toBe(url);

    expect(DdRum.stopResource.mock.calls.length).toBe(1);
    expect(DdRum.stopResource.mock.calls[0][0]).toBe(
        DdRum.startResource.mock.calls[0][0]
    );
    expect(DdRum.stopResource.mock.calls[0][1]).toBe(200);
    expect(DdRum.stopResource.mock.calls[0][2]).toBe('xhr');
    expect(DdRum.stopResource.mock.calls[0][3]).toBeGreaterThan(0);

    expect(xhr.originalOpenCalled).toBe(true);
    expect(xhr.originalSendCalled).toBe(true);
    expect(xhr.originalOnReadyStateChangeCalled).toBe(true);
});

it('M intercept failing XHR request W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    const method = 'GET';
    const url = 'https://api.example.com/v2/user';
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

    // WHEN
    const xhr = new XMLHttpRequestMock();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(500, 'error');
    await flushPromises();

    // THEN
    expect(DdRum.startResource.mock.calls.length).toBe(1);
    expect(DdRum.startResource.mock.calls[0][1]).toBe(method);
    expect(DdRum.startResource.mock.calls[0][2]).toBe(url);

    expect(DdRum.stopResource.mock.calls.length).toBe(1);
    expect(DdRum.stopResource.mock.calls[0][0]).toBe(
        DdRum.startResource.mock.calls[0][0]
    );
    expect(DdRum.stopResource.mock.calls[0][1]).toBe(500);
    expect(DdRum.stopResource.mock.calls[0][2]).toBe('xhr');
    expect(DdRum.stopResource.mock.calls[0][3]).toBeGreaterThan(0);

    expect(xhr.originalOpenCalled).toBe(true);
    expect(xhr.originalSendCalled).toBe(true);
    expect(xhr.originalOnReadyStateChangeCalled).toBe(true);
});

it('M intercept aborted XHR request W startTracking() + XHR.open() + XHR.send() + XHR.abort()', async () => {
    // GIVEN
    const method = 'GET';
    const url = 'https://api.example.com/v2/user';
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

    // WHEN
    const xhr = new XMLHttpRequestMock();
    xhr.open(method, url);
    xhr.send();
    xhr.abort();
    xhr.complete(0, undefined);
    await flushPromises();

    // THEN
    expect(DdRum.startResource.mock.calls.length).toBe(1);
    expect(DdRum.startResource.mock.calls[0][1]).toBe(method);
    expect(DdRum.startResource.mock.calls[0][2]).toBe(url);

    expect(DdRum.stopResource.mock.calls.length).toBe(1);
    expect(DdRum.stopResource.mock.calls[0][0]).toBe(
        DdRum.startResource.mock.calls[0][0]
    );
    expect(DdRum.stopResource.mock.calls[0][1]).toBe(0);
    expect(DdRum.stopResource.mock.calls[0][2]).toBe('xhr');
    expect(DdRum.stopResource.mock.calls[0][3]).toBe(-1);

    expect(xhr.originalOpenCalled).toBe(true);
    expect(xhr.originalSendCalled).toBe(true);
    expect(xhr.originalOnReadyStateChangeCalled).toBe(true);
});

it('M add the span id in the request headers W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    const method = 'GET';
    const url = 'https://api.example.com/v2/user';
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

    // WHEN
    const xhr = new XMLHttpRequestMock();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const spanId = xhr.requestHeaders[PARENT_ID_HEADER_KEY];
    expect(spanId).toBeDefined();
    expect(spanId).toMatch(/[1-9].+/);
});

it('M add the trace id in the request headers W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    const method = 'GET';
    const url = 'https://api.example.com/v2/user';
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

    // WHEN
    const xhr = new XMLHttpRequestMock();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const traceId = xhr.requestHeaders[TRACE_ID_HEADER_KEY];
    expect(traceId).toBeDefined();
    expect(traceId).toMatch(/[1-9].+/);
});

it('M generate different ids for spanId and traceId in request headers', async () => {
    // GIVEN
    const method = 'GET';
    const url = 'https://api.example.com/v2/user';
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

    // WHEN
    const xhr = new XMLHttpRequestMock();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const traceId = xhr.requestHeaders[TRACE_ID_HEADER_KEY];
    const spanId = xhr.requestHeaders[PARENT_ID_HEADER_KEY];
    expect(traceId !== spanId).toBeTruthy();
});

it('M add origin as RUM in the request headers W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    const method = 'GET';
    const url = 'https://api.example.com/v2/user';
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

    // WHEN
    const xhr = new XMLHttpRequestMock();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    expect(xhr.requestHeaders[ORIGIN_HEADER_KEY]).toBe(ORIGIN_RUM);
});

it('M force the agent to keep the request generated trace W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    const method = 'GET';
    const url = 'https://api.example.com/v2/user';
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

    // WHEN
    const xhr = new XMLHttpRequestMock();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    expect(xhr.requestHeaders[SAMPLING_PRIORITY_HEADER_KEY]).toBe('1');
});

it('M mark the request generated trace for sampling W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    const method = 'GET';
    const url = 'https://api.example.com/v2/user';
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

    // WHEN
    const xhr = new XMLHttpRequestMock();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    expect(xhr.requestHeaders[SAMPLED_HEADER_KEY]).toBe('1');
});

it('M add the span id as resource attributes W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    const method = 'GET';
    const url = 'https://api.example.com/v2/user';
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

    // WHEN
    const xhr = new XMLHttpRequestMock();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const spanId = DdRum.startResource.mock.calls[0][3]['_dd.span_id'];
    expect(spanId).toBeDefined();
    expect(spanId).toMatch(/[1-9].+/);
});

it('M add the trace id as resource attributes W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    const method = 'GET';
    const url = 'https://api.example.com/v2/user';
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

    // WHEN
    const xhr = new XMLHttpRequestMock();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const traceId = DdRum.startResource.mock.calls[0][3]['_dd.trace_id'];
    expect(traceId).toBeDefined();
    expect(traceId).toMatch(/[1-9].+/);
});

it('M generate different ids for spanId and traceId for resource attributes', async () => {
    // GIVEN
    const method = 'GET';
    const url = 'https://api.example.com/v2/user';
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

    // WHEN
    const xhr = new XMLHttpRequestMock();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const traceId = DdRum.startResource.mock.calls[0][3]['_dd.trace_id'];
    const spanId = DdRum.startResource.mock.calls[0][3]['_dd.span_id'];
    expect(traceId !== spanId).toBeTruthy();
});

describe.each([['android'], ['ios']])('timings test', platform => {
    it(`M generate resource timings W startTracking() + XHR.open() + XHR.send(), platform=${platform}`, async () => {
        // GIVEN
        const method = 'GET';
        const url = 'https://api.example.com/v2/user';
        DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

        jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
            OS: platform
        }));

        // WHEN
        const xhr = new XMLHttpRequestMock();
        xhr.open(method, url);
        xhr.send();
        xhr.notifyResponseArrived();
        xhr.complete(200, 'ok');
        await flushPromises();

        // THEN
        const timings =
            DdRum.stopResource.mock.calls[0][4]['_dd.resource_timings'];

        if (Platform.OS === 'ios') {
            expect(timings['firstByte']['startTime']).toBeGreaterThan(0);
        } else {
            expect(timings['firstByte']['startTime']).toBe(0);
        }
        expect(timings['firstByte']['duration']).toBeGreaterThan(0);

        expect(timings['download']['startTime']).toBeGreaterThan(0);
        expect(timings['download']['duration']).toBeGreaterThan(0);

        if (Platform.OS === 'ios') {
            expect(timings['fetch']['startTime']).toBeGreaterThan(0);
        } else {
            expect(timings['fetch']['startTime']).toBe(0);
        }
        expect(timings['fetch']['duration']).toBeGreaterThan(0);
    });

    it(`M generate resource timings W startTracking() + XHR.open() + XHR.send() + XHR.abort(), platform=${platform}`, async () => {
        // GIVEN
        const method = 'GET';
        const url = 'https://api.example.com/v2/user';
        DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

        jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
            OS: platform
        }));

        // WHEN
        const xhr = new XMLHttpRequestMock();
        xhr.open(method, url);
        xhr.send();
        xhr.notifyResponseArrived();
        xhr.abort();
        xhr.complete(0, undefined);
        await flushPromises();

        // THEN
        const timings =
            DdRum.stopResource.mock.calls[0][4]['_dd.resource_timings'];

        if (Platform.OS === 'ios') {
            expect(timings['firstByte']['startTime']).toBeGreaterThan(0);
        } else {
            expect(timings['firstByte']['startTime']).toBe(0);
        }
        expect(timings['firstByte']['duration']).toBeGreaterThan(0);

        expect(timings['download']['startTime']).toBeGreaterThan(0);
        expect(timings['download']['duration']).toBeGreaterThan(0);

        if (Platform.OS === 'ios') {
            expect(timings['fetch']['startTime']).toBeGreaterThan(0);
        } else {
            expect(timings['fetch']['startTime']).toBe(0);
        }
        expect(timings['fetch']['duration']).toBeGreaterThan(0);
    });
});

it('M not generate resource timings W startTracking() + XHR.open() + XHR.send() + XHR.abort() before load started', async () => {
    // GIVEN
    const method = 'GET';
    const url = 'https://api.example.com/v2/user';
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequestMock);

    // WHEN
    const xhr = new XMLHttpRequestMock();
    xhr.open(method, url);
    xhr.send();
    xhr.abort();
    xhr.complete(0, undefined);
    await flushPromises();

    // THEN
    const attributes = DdRum.stopResource.mock.calls[0][4];

    expect(attributes['_dd.resource_timings']).toBeNull();
});

describe.each(
    ['blob', 'arraybuffer', 'text', '', 'json'].map(responseType => {
        const xhr = new XMLHttpRequestMock();
        xhr.readyState = XMLHttpRequestMock.DONE;
        xhr.responseType = responseType;
        xhr.response = {};

        const contentLength = randomInt(1_000_000_000);
        xhr.setResponseHeader('Content-Length', contentLength.toString());
        return {
            xhr,
            responseType: responseType || '_empty_',
            expectedSize: contentLength
        };
    })
)(
    'Response size from response header',
    ({ xhr, responseType, expectedSize }) => {
        it(`M calculate response size W calculateResponseSize(), responseType=${responseType}`, () => {
            // WHEN
            const size = calculateResponseSize(
                (xhr as unknown) as XMLHttpRequest
            );

            // THEN
            expect(size).toEqual(expectedSize);
        });
    }
);

it('M calculate response size W calculateResponseSize() { responseType=blob }', () => {
    // GIVEN
    const xhr = new XMLHttpRequestMock();
    xhr.readyState = XMLHttpRequestMock.DONE;
    xhr.responseType = 'blob';

    const expectedSize = randomInt(1_000_000);
    xhr.response = {
        get size() {
            return expectedSize;
        }
    };

    // WHEN
    const size = calculateResponseSize((xhr as unknown) as XMLHttpRequest);

    // THEN
    expect(size).toEqual(expectedSize);
});

it('M calculate response size W calculateResponseSize() { responseType=arraybuffer }', () => {
    // GIVEN
    const xhr = new XMLHttpRequestMock();
    xhr.readyState = XMLHttpRequestMock.DONE;
    xhr.responseType = 'arraybuffer';

    const expectedSize = randomInt(100_000);
    xhr.response = new ArrayBuffer(expectedSize);

    // WHEN
    const size = calculateResponseSize((xhr as unknown) as XMLHttpRequest);

    // THEN
    expect(size).toEqual(expectedSize);
});

it('M calculate response size W calculateResponseSize() { responseType=text }', () => {
    // GIVEN
    const xhr = new XMLHttpRequestMock();
    xhr.readyState = XMLHttpRequestMock.DONE;
    xhr.responseType = 'text';

    // size per char is 24, but in bytes it is 33.
    const expectedSize = 33;
    xhr.response = '{"foo": "bar+úñïçôδè ℓ"}';

    // WHEN
    const size = calculateResponseSize((xhr as unknown) as XMLHttpRequest);

    // THEN
    expect(size).toEqual(expectedSize);
});

it('M calculate response size W calculateResponseSize() { responseType=_empty_ }', () => {
    // GIVEN
    const xhr = new XMLHttpRequestMock();
    xhr.readyState = XMLHttpRequestMock.DONE;
    xhr.responseType = '';

    // size per char is 24, but in bytes it is 33.
    const expectedSize = 33;
    xhr.response = '{"foo": "bar+úñïçôδè ℓ"}';

    // WHEN
    const size = calculateResponseSize((xhr as unknown) as XMLHttpRequest);

    // THEN
    expect(size).toEqual(expectedSize);
});

it('M calculate response size W calculateResponseSize() { responseType=json }', () => {
    // GIVEN
    const xhr = new XMLHttpRequestMock();
    xhr.readyState = XMLHttpRequestMock.DONE;
    xhr.responseType = 'json';

    const expectedSize = 24;
    xhr.response = { foo: { bar: 'foobar' } };

    // WHEN
    const size = calculateResponseSize((xhr as unknown) as XMLHttpRequest);

    // THEN
    expect(size).toEqual(expectedSize);
});

it('M not calculate response size W calculateResponseSize() { responseType=document }', () => {
    // GIVEN
    const xhr = new XMLHttpRequestMock();
    xhr.readyState = XMLHttpRequestMock.DONE;
    // document type is not supported by RN, so there are no classes to handle it
    xhr.responseType = 'document';
    xhr.response = {};

    // WHEN
    const size = calculateResponseSize((xhr as unknown) as XMLHttpRequest);

    // THEN
    expect(size).toEqual(-1);
});

it('M return 0 W calculateResponseSize() { error is thrown }', () => {
    // GIVEN
    InternalLog.log.mockClear();

    const xhr = new XMLHttpRequestMock();
    xhr.readyState = XMLHttpRequestMock.DONE;
    xhr.responseType = 'blob';
    const error = new Error();
    xhr.response = {
        get size() {
            throw error;
        }
    };

    // WHEN
    const size = calculateResponseSize((xhr as unknown) as XMLHttpRequest);

    // THEN
    expect(size).toEqual(-1);
    expect(InternalLog.log).toHaveBeenCalled();
    expect(InternalLog.log.mock.calls[0][0]).toBe(
        `${RESOURCE_SIZE_ERROR_MESSAGE}${error}`
    );
    expect(InternalLog.log.mock.calls[0][1]).toBe(SdkVerbosity.ERROR);
});

it('M return 0 W calculateResponseSize() { size is not a number }', () => {
    // GIVEN
    const xhr = new XMLHttpRequestMock();
    xhr.readyState = XMLHttpRequestMock.DONE;
    xhr.responseType = 'blob';

    // we pass empty object, so that .size property is missing, we will get undefined
    xhr.response = {};

    // WHEN
    const size = calculateResponseSize((xhr as unknown) as XMLHttpRequest);

    // THEN
    expect(size).toEqual(-1);
});

it('M return 0 W calculateResponseSize() { no response }', () => {
    // GIVEN
    const xhr = new XMLHttpRequestMock();
    xhr.readyState = XMLHttpRequestMock.DONE;
    xhr.responseType = 'blob';
    xhr.response = null;

    // WHEN
    const size = calculateResponseSize((xhr as unknown) as XMLHttpRequest);

    // THEN
    expect(size).toEqual(-1);
});
