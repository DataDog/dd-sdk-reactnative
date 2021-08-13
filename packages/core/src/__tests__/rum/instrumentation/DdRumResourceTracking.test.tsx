/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRumResourceTracking, PARENT_ID_HEADER_KEY, TRACE_ID_HEADER_KEY, ORIGIN_RUM, ORIGIN_HEADER_KEY } from '../../../rum/instrumentation/DdRumResourceTracking'
import { DdRum } from '../../../index';
import { Platform } from 'react-native';

jest.useFakeTimers()

jest.mock('../../../foundation', () => {
    return {
        DdRum: {
            startResource: jest.fn().mockResolvedValue(() => {
                return Promise.resolve()
            }),

            stopResource: jest.fn().mockResolvedValue(() => {
                return Promise.resolve()
            })
        },
    };
});

class XMLHttpRequest {

    static readonly UNSENT = 0;
    static readonly OPENED = 1;
    static readonly HEADERS_RECEIVED = 2;
    static readonly LOADING = 3;
    static readonly DONE = 4;

    public response: string | undefined = undefined
    public status: number | undefined = undefined
    public readyState: number = XMLHttpRequest.UNSENT
    public headers: Map<String, String> = new Map()

    constructor() {

    }

    public originalOpenCalled: boolean = false
    public originalSendCalled: boolean = false
    public originalOnReadyStateChangeCalled: boolean = false

    open(method: string, url: string) {
        this.originalOpenCalled = true;
    }
    send() {
        this.originalSendCalled = true;
    }
    onreadystatechange() {
        this.originalOnReadyStateChangeCalled = true
    }

    abort() {
        this.status = 0
    }

    notifyResponseArrived() {
        this.readyState = XMLHttpRequest.HEADERS_RECEIVED
        this.onreadystatechange()
    }

    complete(status: number, response?: string) {
        this.response = response
        this.status = status
        this.readyState = XMLHttpRequest.DONE
        this.onreadystatechange()
    }

    setRequestHeader(header: string, value: string): void {
        this.headers[header] = value
    }
}

const flushPromises = () => new Promise(setImmediate);

beforeEach(() => {
    DdRum.startResource.mockClear();
    DdRum.stopResource.mockClear();

    // we need this because with ms precision between Date.now() calls we can get 0, so we advance
    // it manually with each call
    let now = Date.now()
    jest.spyOn(Date, 'now').mockImplementation(() => {
        now += 5
        return now
    })

    jest.setTimeout(20000);
})

afterEach(() => {
    DdRumResourceTracking.stopTracking();
    Date.now.mockClear();
})


it('M intercept XHR request W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    let method = "GET"
    let url = "https://api.example.com/v2/user"
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);

    // WHEN
    const xhr = new XMLHttpRequest();
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
    expect(DdRum.stopResource.mock.calls[0][0]).toBe(DdRum.startResource.mock.calls[0][0]);
    expect(DdRum.stopResource.mock.calls[0][1]).toBe(200);
    expect(DdRum.stopResource.mock.calls[0][2]).toBe('xhr');

    expect(xhr.originalOpenCalled).toBe(true);
    expect(xhr.originalSendCalled).toBe(true);
    expect(xhr.originalOnReadyStateChangeCalled).toBe(true);
})

it('M intercept failing XHR request W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    let method = "GET"
    let url = "https://api.example.com/v2/user"
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);

    // WHEN
    const xhr = new XMLHttpRequest();
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
    expect(DdRum.stopResource.mock.calls[0][0]).toBe(DdRum.startResource.mock.calls[0][0]);
    expect(DdRum.stopResource.mock.calls[0][1]).toBe(500);
    expect(DdRum.stopResource.mock.calls[0][2]).toBe('xhr');

    expect(xhr.originalOpenCalled).toBe(true);
    expect(xhr.originalSendCalled).toBe(true);
    expect(xhr.originalOnReadyStateChangeCalled).toBe(true);
})

it('M intercept aborted XHR request W startTracking() + XHR.open() + XHR.send() + XHR.abort()', async () => {
    // GIVEN
    let method = "GET"
    let url = "https://api.example.com/v2/user"
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);

    // WHEN
    const xhr = new XMLHttpRequest();
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
    expect(DdRum.stopResource.mock.calls[0][0]).toBe(DdRum.startResource.mock.calls[0][0]);
    expect(DdRum.stopResource.mock.calls[0][1]).toBe(0);
    expect(DdRum.stopResource.mock.calls[0][2]).toBe('xhr');

    expect(xhr.originalOpenCalled).toBe(true);
    expect(xhr.originalSendCalled).toBe(true);
    expect(xhr.originalOnReadyStateChangeCalled).toBe(true);
})


it('M add the span id in the request headers W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    let method = "GET"
    let url = "https://api.example.com/v2/user"
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);

    // WHEN
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const spanId = xhr.headers[PARENT_ID_HEADER_KEY];
    expect(spanId).toBeDefined();
    expect(spanId).toMatch(/[1-9].+/);
})

it('M add the trace id in the request headers W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    let method = "GET"
    let url = "https://api.example.com/v2/user"
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);

    // WHEN
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const traceId = xhr.headers[TRACE_ID_HEADER_KEY];
    expect(traceId).toBeDefined();
    expect(traceId).toMatch(/[1-9].+/);
})

it('M generate different ids for spanId and traceId in request headers', async () => {
    // GIVEN
    let method = "GET"
    let url = "https://api.example.com/v2/user"
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);

    // WHEN
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const traceId = xhr.headers[TRACE_ID_HEADER_KEY];
    const spanId = xhr.headers[PARENT_ID_HEADER_KEY];
    expect(traceId !== spanId).toBeTruthy()
})

it('M add origin as RUM in the request headers W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    let method = "GET"
    let url = "https://api.example.com/v2/user"
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);

    // WHEN
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    expect(xhr.headers[ORIGIN_HEADER_KEY]).toBe(ORIGIN_RUM)
})

it('M add the span id as resource attributes W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    let method = "GET"
    let url = "https://api.example.com/v2/user"
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);

    // WHEN
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const spanId = DdRum.startResource.mock.calls[0][3]["_dd.span_id"];
    expect(spanId).toBeDefined();
    expect(spanId).toMatch(/[1-9].+/);
})

it('M add the trace id as resource attributes W startTracking() + XHR.open() + XHR.send()', async () => {
    // GIVEN
    let method = "GET"
    let url = "https://api.example.com/v2/user"
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);

    // WHEN
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const traceId = DdRum.startResource.mock.calls[0][3]["_dd.trace_id"];
    expect(traceId).toBeDefined();
    expect(traceId).toMatch(/[1-9].+/);
})

it('M generate different ids for spanId and traceId for resource attributes', async () => {
    // GIVEN
    let method = "GET"
    let url = "https://api.example.com/v2/user"
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);

    // WHEN
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const traceId = DdRum.startResource.mock.calls[0][3]["_dd.trace_id"];
    const spanId = DdRum.startResource.mock.calls[0][3]["_dd.span_id"];
    expect(traceId !== spanId).toBeTruthy();
})

describe.each([['android'], ['ios']])('timings test', (platform) => {
    it(`M generate resource timings W startTracking() + XHR.open() + XHR.send(), platform=${platform}`, async () => {
        // GIVEN
        let method = "GET"
        let url = "https://api.example.com/v2/user"
        DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);

        jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
            OS: platform
        }));

        // WHEN
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.send();
        xhr.notifyResponseArrived();
        xhr.complete(200, 'ok');
        await flushPromises();

        // THEN
        const timings = DdRum.stopResource.mock.calls[0][3]["_dd.resource_timings"];

        if (Platform.OS === 'ios') {
            expect(timings['firstByte']['startTime']).toBeGreaterThan(0)
        } else {
            expect(timings['firstByte']['startTime']).toBe(0)
        }
        expect(timings['firstByte']['duration']).toBeGreaterThan(0)

        expect(timings['download']['startTime']).toBeGreaterThan(0)
        expect(timings['download']['duration']).toBeGreaterThan(0)

        if (Platform.OS === 'ios') {
            expect(timings['fetch']['startTime']).toBeGreaterThan(0)
        } else {
            expect(timings['fetch']['startTime']).toBe(0)
        }
        expect(timings['fetch']['duration']).toBeGreaterThan(0)
    })

    it(`M generate resource timings W startTracking() + XHR.open() + XHR.send() + XHR.abort(), platform=${platform}`, async () => {
        // GIVEN
        let method = "GET"
        let url = "https://api.example.com/v2/user"
        DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);

        jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
            OS: platform
        }));

        // WHEN
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.send();
        xhr.notifyResponseArrived();
        xhr.abort();
        xhr.complete(0, undefined);
        await flushPromises();

        // THEN
        const timings = DdRum.stopResource.mock.calls[0][3]["_dd.resource_timings"];

        if (Platform.OS === 'ios') {
            expect(timings['firstByte']['startTime']).toBeGreaterThan(0)
        } else {
            expect(timings['firstByte']['startTime']).toBe(0)
        }
        expect(timings['firstByte']['duration']).toBeGreaterThan(0)

        expect(timings['download']['startTime']).toBeGreaterThan(0)
        expect(timings['download']['duration']).toBeGreaterThan(0)

        if (Platform.OS === 'ios') {
            expect(timings['fetch']['startTime']).toBeGreaterThan(0)
        } else {
            expect(timings['fetch']['startTime']).toBe(0)
        }
        expect(timings['fetch']['duration']).toBeGreaterThan(0)
    })
})

it('M not generate resource timings W startTracking() + XHR.open() + XHR.send() + XHR.abort() before load started', async () => {
    // GIVEN
    let method = "GET"
    let url = "https://api.example.com/v2/user"
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);

    // WHEN
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.send();
    xhr.abort();
    xhr.complete(0, undefined);
    await flushPromises();

    // THEN
    const attributes = DdRum.stopResource.mock.calls[0][3];

    expect(attributes['_dd.resource_timings']).toBeNull()
})
