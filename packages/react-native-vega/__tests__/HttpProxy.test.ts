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

const loadProxyCopy = (): typeof import('../src/HttpProxy') => {
    let copy!: typeof import('../src/HttpProxy');
    jest.isolateModules(() => {
        copy = jest.requireActual('../src/HttpProxy');
    });
    return copy;
};

const flushPromises = () =>
    new Promise(jest.requireActual('timers').setImmediate);

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

    it('coordinates listeners and upload exclusion across duplicate package copies', async () => {
        const listeners = new Set<(event: HttpRequestEvent) => Promise<void>>();
        mockAddListener.mockImplementation((_eventName, listener) => {
            listeners.add(listener);
            return {
                remove: () => {
                    listeners.delete(listener);
                    mockRemove();
                }
            };
        });
        const first = loadProxyCopy();
        const second = loadProxyCopy();
        expect(first).not.toBe(second);

        const reportResource = jest.fn();
        const proxy = new FetchProxy({
            fetchGlobal: globalThis,
            headersType: Headers,
            resourceReporter: ({
                reportResource
            } as unknown) as ResourceReporter
        });
        fetchMock.mockResolvedValue({ status: 202, headers: new Headers() });
        proxy.onTrackingStart({
            tracingSamplingRate: 100,
            firstPartyHostsRegexMap: []
        });
        const firstStop = await first.startHttpProxy();
        try {
            stop = await second.startHttpProxy();
            expect(listeners.size).toBe(1);
            expect(mockStopHttpProxy).toHaveBeenCalledTimes(1);
            firstStop();
            expect(listeners.size).toBe(1);
            expect(mockStopHttpProxy).toHaveBeenCalledTimes(1);
            await Promise.all(
                Array.from(listeners, listener =>
                    listener({
                        requestId: 'shared-upload',
                        url: 'https://proxy.example.com/upload',
                        headers: 'Content-Type: application/json\n',
                        body: '{}'
                    })
                )
            );
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock.mock.calls[0][1].headers).toEqual({
                'Content-Type': 'application/json'
            });
            expect(reportResource).not.toHaveBeenCalled();
            await fetch('https://proxy.example.com/upload');
            expect(reportResource).toHaveBeenCalledTimes(1);
        } finally {
            firstStop();
            proxy.onTrackingStop();
        }
    });

    it('serializes a pending native handshake across duplicate package copies', async () => {
        let resolveStart!: () => void;
        mockStartHttpProxy.mockReturnValueOnce(
            new Promise<void>(resolve => {
                resolveStart = resolve;
            })
        );
        const first = loadProxyCopy();
        const second = loadProxyCopy();
        const firstStart = first.startHttpProxy();
        await flushPromises();
        const secondStart = second.startHttpProxy();
        try {
            await flushPromises();
            expect(mockStartHttpProxy).toHaveBeenCalledTimes(1);
            expect(mockStopHttpProxy).not.toHaveBeenCalled();
        } finally {
            resolveStart();
            const firstStop = await firstStart;
            stop = await secondStart;
            firstStop();
        }
        expect(mockStopHttpProxy).toHaveBeenCalledTimes(1);
        expect(mockStopHttpProxy.mock.invocationCallOrder[0]).toBeLessThan(
            mockStartHttpProxy.mock.invocationCallOrder[1]
        );
    });

    describe('request deadlines', () => {
        beforeEach(() => jest.useFakeTimers());
        afterEach(() => jest.useRealTimers());

        it.each([true, false])(
            'bounds a hanging fetch with AbortController available: %s',
            async hasAbort => {
                const g = (globalThis as unknown) as {
                    AbortController?: typeof AbortController;
                };
                const originalAbort = g.AbortController;
                if (!hasAbort) {
                    delete g.AbortController;
                }
                try {
                    fetchMock.mockReturnValue(new Promise(() => undefined));
                    stop = await startHttpProxy();
                    const request = requestListener({
                        requestId: 'timeout',
                        url: 'url',
                        headers: '',
                        body: ''
                    });
                    await jest.advanceTimersByTimeAsync(25_000);
                    expect(mockHttpResponse).toHaveBeenCalledWith('timeout', 0);
                    await request;
                    if (hasAbort) {
                        expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(
                            true
                        );
                    }
                    expect(jest.getTimerCount()).toBe(0);
                } finally {
                    g.AbortController = originalAbort;
                }
            }
        );

        it('clears the deadline when a response completes', async () => {
            stop = await startHttpProxy();
            await requestListener({
                requestId: 'complete',
                url: 'url',
                headers: '',
                body: ''
            });
            expect(mockHttpResponse).toHaveBeenCalledWith('complete', 202);
            expect(jest.getTimerCount()).toBe(0);
            await jest.advanceTimersByTimeAsync(30_000);
            expect(mockHttpResponse).toHaveBeenCalledTimes(1);
        });

        it('settles a hanging request and clears its deadline when stopped', async () => {
            fetchMock.mockReturnValue(new Promise(() => undefined));
            stop = await startHttpProxy();
            const request = requestListener({
                requestId: 'stopped',
                url: 'url',
                headers: '',
                body: ''
            });
            stop();
            await jest.advanceTimersByTimeAsync(0);
            expect(mockHttpResponse).toHaveBeenCalledWith('stopped', 0);
            await request;
            expect(jest.getTimerCount()).toBe(0);
        });

        it.each(['resolve', 'reject'])(
            'ignores a late fetch %s after the deadline',
            async outcome => {
                let resolveFetch!: (response: { status: number }) => void;
                let rejectFetch!: (error: Error) => void;
                fetchMock.mockReturnValue(
                    new Promise((resolve, reject) => {
                        resolveFetch = resolve;
                        rejectFetch = reject;
                    })
                );
                const abort = jest.spyOn(AbortController.prototype, 'abort');
                try {
                    stop = await startHttpProxy();
                    const request = requestListener({
                        requestId: 'late',
                        url: 'url',
                        headers: '',
                        body: ''
                    });
                    await jest.advanceTimersByTimeAsync(25_000);
                    expect(mockHttpResponse).toHaveBeenCalledWith('late', 0);
                    await request;
                    if (outcome === 'resolve') {
                        resolveFetch({ status: 202 });
                    } else {
                        rejectFetch(new Error('late network failure'));
                    }
                    await jest.advanceTimersByTimeAsync(0);
                    stop();
                    expect(abort).toHaveBeenCalledTimes(1);
                    expect(mockHttpResponse).toHaveBeenCalledTimes(1);
                    expect(jest.getTimerCount()).toBe(0);
                } finally {
                    abort.mockRestore();
                }
            }
        );
    });

    it('cancels in-flight fetches and forwards completed responses during cleanup', async () => {
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
        resolveFetch({ status: 202 });
        // Let the response win the race before cleanup runs its cancellation.
        await Promise.resolve();
        stop();
        expect(signal.aborted).toBe(true);
        await request;
        expect(mockHttpResponse).toHaveBeenCalledWith('pending', 202);
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
