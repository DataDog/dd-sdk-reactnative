/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRumResourceTracking, PARENT_ID_HEADER_KEY, TRACE_ID_HEADER_KEY, ORIGIN_RUM, ORIGIN_HEADER_KEY } from '../../../rum/instrumentation/DdRumResourceTracking'
import { DdRum } from '../../../index';

jest.useFakeTimers()

jest.mock('../../../dd-foundation', () => {
    return {
        DdRum: {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            startResource: jest.fn().mockImplementation(() => {
                return new Promise((resolve, reject) => {
                    resolve()
                })
            }),

            // eslint-disable-next-line @typescript-eslint/no-empty-function
            stopResource: jest.fn().mockImplementation(() => {
                return new Promise((resolve, reject) => {
                    resolve()
                })
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


let originalOpen: Function
let originalSend: Function

const flushPromises = () => new Promise(setImmediate);

beforeEach(() => {
    DdRum.startResource.mockClear();
    DdRum.stopResource.mockClear();

    jest.setTimeout(20000);
})

afterEach(() => {
    DdRumResourceTracking.stopTracking();
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
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const spanId = DdRum.startResource.mock.calls[0][4]["_dd.span_id"];
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
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const traceId = DdRum.startResource.mock.calls[0][4]["_dd.trace_id"];
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
    xhr.complete(200, 'ok');
    await flushPromises();

    // THEN
    const traceId = DdRum.startResource.mock.calls[0][4]["_dd.trace_id"];
    const spanId = DdRum.startResource.mock.calls[0][4]["_dd.span_id"];
    expect(traceId !== spanId).toBeTruthy();
})