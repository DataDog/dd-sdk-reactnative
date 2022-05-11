/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export class XMLHttpRequestMock {
    static readonly UNSENT = 0;
    static readonly OPENED = 1;
    static readonly HEADERS_RECEIVED = 2;
    static readonly LOADING = 3;
    static readonly DONE = 4;

    public response?: any;
    public responseType?: string;
    public status: number = 0;
    public readyState: number = XMLHttpRequestMock.UNSENT;
    public requestHeaders: Map<string, string> = new Map();
    public responseHeaders: Map<string, string> = new Map();

    constructor() {}

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

    complete(status: number, response?: any, responseType?: string) {
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
