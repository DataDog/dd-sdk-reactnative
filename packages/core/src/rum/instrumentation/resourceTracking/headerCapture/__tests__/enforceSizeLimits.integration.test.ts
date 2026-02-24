/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { BufferSingleton } from '../../../../../sdk/DatadogProvider/Buffer/BufferSingleton';
import { XMLHttpRequestMock } from '../../__tests__/__utils__/XMLHttpRequestMock';
import { firstPartyHostsRegexMapBuilder } from '../../distributedTracing/firstPartyHosts';
import { ResourceReporter } from '../../requestProxy/XHRProxy/DatadogRumResource/ResourceReporter';
import { XHRProxy } from '../../requestProxy/XHRProxy/XHRProxy';
import {
    DEFAULT_REQUEST_HEADERS,
    DEFAULT_RESPONSE_HEADERS,
    CANONICAL_REQUEST_HEADERS,
    CANONICAL_RESPONSE_HEADERS
} from '../captureHeaders';
import { MAX_HEADER_VALUE_BYTES } from '../enforceSizeLimits';
import type { CompiledHeaderCaptureConfig } from '../types';

jest.useFakeTimers();

const DdNativeRum = NativeModules.DdRum;

const flushPromises = () =>
    new Promise(jest.requireActual('timers').setImmediate);

let xhrProxy: any;

beforeEach(() => {
    DdNativeRum.startResource.mockClear();
    DdNativeRum.stopResource.mockClear();
    BufferSingleton.onInitialization();

    xhrProxy = new XHRProxy({
        xhrType: XMLHttpRequestMock,
        resourceReporter: new ResourceReporter([])
    } as {
        xhrType: typeof XMLHttpRequest;
        resourceReporter: ResourceReporter;
    });

    let now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => {
        now += 5;
        return now;
    });
});

afterEach(() => {
    xhrProxy.onTrackingStop();
    (Date.now as jest.MockedFunction<typeof Date.now>).mockClear();
});

describe('enforceSizeLimits integration', () => {
    it('truncates oversized header values before they reach stopResource', async () => {
        // GIVEN - a value longer than MAX_HEADER_VALUE_BYTES
        const longValue = 'x'.repeat(256);
        const method = 'GET';
        const url = 'https://api.example.com/data';
        const defaultsConfig: CompiledHeaderCaptureConfig = [
            {
                urlRegex: /.*/,
                requestHeaderNames: new Set(DEFAULT_REQUEST_HEADERS),
                responseHeaderNames: new Set(DEFAULT_RESPONSE_HEADERS),
                isScoped: false,
                requestHeaderCasing: new Map(CANONICAL_REQUEST_HEADERS),
                responseHeaderCasing: new Map(CANONICAL_RESPONSE_HEADERS)
            }
        ];
        xhrProxy.onTrackingStart({
            tracingSamplingRate: 100,
            firstPartyHostsRegexMap: firstPartyHostsRegexMapBuilder([]),
            headerCaptureConfig: defaultsConfig
        });

        // WHEN
        const xhr = new XMLHttpRequestMock();
        xhr.open(method, url);
        xhr.setRequestHeader('Content-Type', longValue);
        xhr.send();
        xhr.notifyResponseArrived();
        xhr.getAllResponseHeaders.mockReturnValue(
            `content-type: ${longValue}\r\n`
        );
        xhr.complete(200, 'ok');
        await flushPromises();

        // THEN - values are truncated to MAX_HEADER_VALUE_BYTES
        const stopContext = DdNativeRum.stopResource.mock.calls[0][4];
        expect(stopContext['_dd.request_headers']['Content-Type'].length).toBe(
            MAX_HEADER_VALUE_BYTES
        );
        expect(stopContext['_dd.response_headers']['Content-Type'].length).toBe(
            MAX_HEADER_VALUE_BYTES
        );
    });

    it('disabled config (null): enforceSizeLimits is never invoked', async () => {
        // GIVEN
        const enforceSizeLimitsModule = require('../enforceSizeLimits');
        const spy = jest.spyOn(enforceSizeLimitsModule, 'enforceSizeLimits');

        const method = 'GET';
        const url = 'https://api.example.com/data';
        const disabledConfig: CompiledHeaderCaptureConfig = null;
        xhrProxy.onTrackingStart({
            tracingSamplingRate: 100,
            firstPartyHostsRegexMap: firstPartyHostsRegexMapBuilder([]),
            headerCaptureConfig: disabledConfig
        });

        // WHEN
        const xhr = new XMLHttpRequestMock();
        xhr.open(method, url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send();
        xhr.notifyResponseArrived();
        xhr.getAllResponseHeaders.mockReturnValue(
            'content-type: text/html\r\n'
        );
        xhr.complete(200, 'ok');
        await flushPromises();

        // THEN - enforceSizeLimits was NOT called (zero overhead)
        expect(spy).not.toHaveBeenCalled();

        // Also verify no headers in stopResource context
        const stopContext = DdNativeRum.stopResource.mock.calls[0][4];
        expect(stopContext['_dd.request_headers']).toBeUndefined();
        expect(stopContext['_dd.response_headers']).toBeUndefined();

        spy.mockRestore();
    });

    it('silent operation: no console warnings or errors during enforcement', async () => {
        // GIVEN - oversized headers that will trigger truncation
        const longValue = 'y'.repeat(256);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation();

        const method = 'GET';
        const url = 'https://api.example.com/data';
        const defaultsConfig: CompiledHeaderCaptureConfig = [
            {
                urlRegex: /.*/,
                requestHeaderNames: new Set(DEFAULT_REQUEST_HEADERS),
                responseHeaderNames: new Set(DEFAULT_RESPONSE_HEADERS),
                isScoped: false,
                requestHeaderCasing: new Map(CANONICAL_REQUEST_HEADERS),
                responseHeaderCasing: new Map(CANONICAL_RESPONSE_HEADERS)
            }
        ];
        xhrProxy.onTrackingStart({
            tracingSamplingRate: 100,
            firstPartyHostsRegexMap: firstPartyHostsRegexMapBuilder([]),
            headerCaptureConfig: defaultsConfig
        });

        // WHEN
        const xhr = new XMLHttpRequestMock();
        xhr.open(method, url);
        xhr.setRequestHeader('Content-Type', longValue);
        xhr.send();
        xhr.notifyResponseArrived();
        xhr.getAllResponseHeaders.mockReturnValue(
            `content-type: ${longValue}\r\n`
        );
        xhr.complete(200, 'ok');
        await flushPromises();

        // THEN - no console output during enforcement
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });
});
