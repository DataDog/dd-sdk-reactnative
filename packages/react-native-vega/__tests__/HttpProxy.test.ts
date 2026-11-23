/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { FetchProxy } from '../../core/src/rum/instrumentation/resourceTracking/requestProxy/FetchProxy/FetchProxy';
import type { ResourceReporter } from '../../core/src/rum/instrumentation/resourceTracking/requestProxy/common/ResourceReporter';
import { startHttpProxy } from '../src/HttpProxy';
import { getNativeDdSdk } from '../src/turbo-modules/NativeDdSdk';

const mockAddListener = jest.fn();
const mockRemove = jest.fn();
const mockHttpResponse = jest.fn();
const mockStartHttpProxy = jest.fn();
const mockStopHttpProxy = jest.fn();

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        addListener: mockAddListener
    }))
}));

jest.mock('../src/turbo-modules/NativeDdSdk', () => ({
    getNativeDdSdk: jest.fn(() => ({
        httpResponse: mockHttpResponse,
        startHttpProxy: mockStartHttpProxy,
        stopHttpProxy: mockStopHttpProxy
    }))
}));

interface HttpRequestEvent {
    requestId: string;
    url: string;
    headers: string;
    body: string;
}

describe('HttpProxy', () => {
    let requestListener: (event: HttpRequestEvent) => Promise<void>;
    let fetchMock: jest.Mock;
    let stop: (() => void) | undefined;

    afterEach(async () => {
        stop?.();
        stop = undefined;
        await Promise.resolve();
        await Promise.resolve();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockAddListener.mockImplementation((_eventName, listener) => {
            requestListener = listener;
            return { remove: mockRemove };
        });
        fetchMock = jest.fn().mockResolvedValue({ status: 202 });
        global.fetch = fetchMock;
    });

    it('forwards an SDK upload without adding private HTTP headers', async () => {
        stop = await startHttpProxy();

        await requestListener({
            requestId: 'request-id',
            url: 'https://browser-intake-datadoghq.com/api/v2/rum',
            headers: 'Content-Type: application/json\n',
            body: '{}'
        });

        expect(fetchMock).toHaveBeenCalledWith(
            'https://browser-intake-datadoghq.com/api/v2/rum',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
                signal: expect.any(Object)
            }
        );
        expect(mockHttpResponse).toHaveBeenCalledWith('request-id', 202);
    });

    it('excludes SDK fetches with core tracking enabled, including custom intake URLs', async () => {
        const reportResource = jest.fn();
        const proxy = new FetchProxy({
            fetchGlobal: globalThis,
            headersType: Headers,
            resourceReporter: ({
                reportResource
            } as unknown) as ResourceReporter
        });
        const response = { status: 202, headers: new Headers() };
        let resolveUpload!: (value: typeof response) => void;
        fetchMock.mockResolvedValue(response).mockReturnValueOnce(
            new Promise(resolve => {
                resolveUpload = resolve;
            })
        );
        proxy.onTrackingStart({
            tracingSamplingRate: 100,
            firstPartyHostsRegexMap: []
        });
        try {
            stop = await startHttpProxy();
            const url = 'https://proxy.example.com/upload';
            const upload = requestListener({
                requestId: 'sdk-upload',
                url,
                headers: '',
                body: '{}'
            });
            expect(reportResource).not.toHaveBeenCalled();
            await fetch(url);
            expect(reportResource).toHaveBeenCalledTimes(1);
            resolveUpload(response);
            await upload;
            expect(reportResource).toHaveBeenCalledTimes(1);
            expect(mockHttpResponse).toHaveBeenCalledWith('sdk-upload', 202);
        } finally {
            proxy.onTrackingStop();
        }
    });

    it('reports network failures as retryable', async () => {
        fetchMock.mockRejectedValue(new Error('network failure'));
        stop = await startHttpProxy();
        await requestListener({
            requestId: 'request-id',
            url: 'https://proxy.example.com/upload',
            headers: '',
            body: '{}'
        });
        expect(mockHttpResponse).toHaveBeenCalledWith('request-id', 0);
    });

    it('removes the request listener when stopped', async () => {
        stop = await startHttpProxy();
        stop();
        stop();
        await Promise.resolve();
        await Promise.resolve();
        expect(mockStopHttpProxy).toHaveBeenCalledTimes(1);
        expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it('replaces an earlier listener and ignores stale cleanup and events', async () => {
        const oldStop = await startHttpProxy();
        const oldListener = requestListener;
        stop = await startHttpProxy();
        expect(mockRemove).toHaveBeenCalledTimes(1);
        expect(mockStopHttpProxy).toHaveBeenCalledTimes(1);
        expect(mockStopHttpProxy.mock.invocationCallOrder[0]).toBeLessThan(
            mockStartHttpProxy.mock.invocationCallOrder[1]
        );
        oldStop();
        await oldListener({
            requestId: 'stale',
            url: 'url',
            headers: '',
            body: ''
        });
        expect(mockRemove).toHaveBeenCalledTimes(1);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('cancels in-flight fetches and ignores late responses after cleanup', async () => {
        let resolveFetch!: (response: { status: number }) => void;
        fetchMock.mockReturnValue(
            new Promise(resolve => {
                resolveFetch = resolve;
            })
        );
        stop = await startHttpProxy();
        const request = requestListener({
            requestId: 'pending',
            url: 'url',
            headers: '',
            body: ''
        });
        const signal = fetchMock.mock.calls[0][1].signal;
        stop();
        expect(signal.aborted).toBe(true);
        resolveFetch({ status: 202 });
        await request;
        expect(mockHttpResponse).not.toHaveBeenCalled();
    });

    it('serializes overlapping starts and stops', async () => {
        let resolveStart!: () => void;
        mockStartHttpProxy.mockReturnValueOnce(
            new Promise<void>(resolve => {
                resolveStart = resolve;
            })
        );
        const first = startHttpProxy();
        await Promise.resolve();
        const second = startHttpProxy();
        resolveStart();
        const oldStop = await first;
        stop = await second;
        oldStop();
        expect(mockRemove).toHaveBeenCalledTimes(1);
        expect(mockStopHttpProxy).toHaveBeenCalledTimes(1);
        expect(mockStartHttpProxy).toHaveBeenCalledTimes(2);
    });

    it('contains native teardown failures', async () => {
        mockStopHttpProxy.mockRejectedValueOnce(
            new Error('native unavailable')
        );
        stop = await startHttpProxy();
        expect(() => stop?.()).not.toThrow();
        await Promise.resolve();
        await Promise.resolve();
    });

    it('contains failures when returning a response to native', async () => {
        mockHttpResponse.mockRejectedValueOnce(new Error('native unavailable'));
        stop = await startHttpProxy();
        await expect(
            requestListener({
                requestId: 'failed-response',
                url: 'https://example.com/upload',
                headers: '',
                body: '{}'
            })
        ).resolves.toBeUndefined();
    });

    it('does not start a proxy when the native module is unavailable', async () => {
        (getNativeDdSdk as jest.Mock).mockReturnValueOnce(null);
        stop = await startHttpProxy();
        expect(stop).toEqual(expect.any(Function));
        expect(mockAddListener).not.toHaveBeenCalled();
    });

    it('contains native module lookup failures', async () => {
        (getNativeDdSdk as jest.Mock).mockImplementationOnce(() => {
            throw new Error('native module failed to load');
        });
        stop = await startHttpProxy();
        expect(stop).toEqual(expect.any(Function));
        expect(mockAddListener).not.toHaveBeenCalled();
    });

    it('contains listener registration failures', async () => {
        mockAddListener.mockImplementationOnce(() => {
            throw new Error('event emitter unavailable');
        });
        stop = await startHttpProxy();
        expect(stop).toEqual(expect.any(Function));
    });

    it('registers the JS listener before enabling native uploads', async () => {
        mockStartHttpProxy.mockImplementationOnce(() => {
            expect(mockAddListener).toHaveBeenCalledWith(
                'ddHttpRequest',
                expect.any(Function)
            );
            return Promise.resolve();
        });
        stop = await startHttpProxy();
        expect(mockStartHttpProxy).toHaveBeenCalledTimes(1);
    });

    it('removes the listener if the native handshake fails', async () => {
        mockStartHttpProxy.mockRejectedValueOnce(
            new Error('native transport unavailable')
        );
        stop = await startHttpProxy();
        expect(stop).toEqual(expect.any(Function));
        expect(mockRemove).toHaveBeenCalledTimes(1);
    });
});
