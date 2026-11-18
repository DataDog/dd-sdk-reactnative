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
    public responseType: XMLHttpRequestResponseType = '';
    public status: number = 0;
    public readyState: number = XMLHttpRequestMock.UNSENT;
    public requestHeaders: Map<string, string> = new Map();
    public responseHeaders: Map<string, string> = new Map();

    // eslint-disable-next-line no-empty-function
    constructor() {}
    responseText: string = '';
    responseURL: string = '';
    responseXML: Document = {} as Document;
    statusText: string = '';
    timeout: number = -1;
    upload: XMLHttpRequestUpload = {} as XMLHttpRequestUpload;
    withCredentials: boolean = false;
    getAllResponseHeaders = jest.fn().mockReturnValue('');
    overrideMimeType = jest.fn();
    DONE = 4 as const;
    HEADERS_RECEIVED = 2 as const;
    LOADING = 3 as const;
    OPENED = 1 as const;
    UNSENT = 0 as const;
    addEventListener = jest.fn();
    removeEventListener = jest.fn();
    onabort: (
        this: XMLHttpRequest,
        ev: ProgressEvent<EventTarget>
    ) => any = ev => {};
    onerror: (
        this: XMLHttpRequest,
        ev: ProgressEvent<EventTarget>
    ) => any = ev => {};
    onload: (
        this: XMLHttpRequest,
        ev: ProgressEvent<EventTarget>
    ) => any = ev => {};
    onloadend: (
        this: XMLHttpRequest,
        ev: ProgressEvent<EventTarget>
    ) => any = ev => {};
    onloadstart: (
        this: XMLHttpRequest,
        ev: ProgressEvent<EventTarget>
    ) => any = ev => {};
    onprogress: (
        this: XMLHttpRequest,
        ev: ProgressEvent<EventTarget>
    ) => any = ev => {};
    ontimeout: (
        this: XMLHttpRequest,
        ev: ProgressEvent<EventTarget>
    ) => any = ev => {};
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
        this.requestHeaders.set(header, value);
    }

    setResponseHeader(header: string, value: string): void {
        this.responseHeaders.set(header, value);
    }

    getResponseHeader(header: string): string | null {
        return this.responseHeaders.get(header) ?? null;
    }
}
