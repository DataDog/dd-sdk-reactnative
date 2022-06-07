/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export class XMLHttpRequestMock implements XMLHttpRequest {
    static readonly UNSENT = 0;
    static readonly OPENED = 1;
    static readonly HEADERS_RECEIVED = 2;
    static readonly LOADING = 3;
    static readonly DONE = 4;

    public response: any;
    public responseType: XMLHttpRequestResponseType;
    public status: number = 0;
    public readyState: number = XMLHttpRequestMock.UNSENT;
    public requestHeaders: Map<string, string> = new Map();
    public responseHeaders: Map<string, string> = new Map();

    constructor() {}
    responseText: string;
    responseURL: string;
    responseXML: Document;
    statusText: string;
    timeout: number;
    upload: XMLHttpRequestUpload;
    withCredentials: boolean;
    getAllResponseHeaders = jest.fn();
    overrideMimeType = jest.fn();
    DONE: number;
    HEADERS_RECEIVED: number;
    LOADING: number;
    OPENED: number;
    UNSENT: number;
    addEventListener = jest.fn();
    removeEventListener = jest.fn();
    onabort: (this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any;
    onerror: (this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any;
    onload: (this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any;
    onloadend: (this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any;
    onloadstart: (this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any;
    onprogress: (this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any;
    ontimeout: (this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any;
    dispatchEvent(event: Event): boolean {
        throw new Error('Method not implemented.');
    }

    public originalOpenCalled: boolean = false;
    public originalSendCalled: boolean = false;
    public originalOnReadyStateChangeCalled: boolean = false;

    open(method: string, url: string) {
        this.originalOpenCalled = true;
    }
    send() {
        this.originalSendCalled = true;
    }
    onreadystatechange() {
        this.originalOnReadyStateChangeCalled = true;
    }

    abort() {
        this.status = 0;
    }

    notifyResponseArrived() {
        this.readyState = XMLHttpRequestMock.HEADERS_RECEIVED;
        this.onreadystatechange();
    }

    complete(
        status: number,
        response?: any,
        responseType?: XMLHttpRequestResponseType
    ) {
        this.response = response;
        if (response) {
            this.responseType = responseType ?? 'text';
        }
        this.status = status;
        this.readyState = XMLHttpRequestMock.DONE;
        this.onreadystatechange();
    }

    setRequestHeader(header: string, value: string): void {
        this.requestHeaders[header] = value;
    }

    setResponseHeader(header: string, value: string): void {
        this.responseHeaders[header] = value;
    }

    getResponseHeader(header: string): string | null {
        return this.responseHeaders[header];
    }
}
