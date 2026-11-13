/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { startHttpProxy } from '../src/HttpProxy';
import { patchCoreRumResourceTracking } from '../src/InternalResourceTracking';
import { getNativeDdSdk } from '../src/turbo-modules/NativeDdSdk';

const mockAddListener = jest.fn();
const mockRemove = jest.fn();
const mockHttpResponse = jest.fn();
const mockStartHttpProxy = jest.fn();

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        addListener: mockAddListener
    }))
}));

jest.mock('../src/turbo-modules/NativeDdSdk', () => ({
    getNativeDdSdk: jest.fn(() => ({
        httpResponse: mockHttpResponse,
        startHttpProxy: mockStartHttpProxy
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
        await startHttpProxy();

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
                body: '{}'
            }
        );
        expect(mockHttpResponse).toHaveBeenCalledWith('request-id', 202);
    });

    it('suppresses the matching resource while the SDK upload is active', async () => {
        let resolveFetch: (response: { status: number }) => void = () =>
            undefined;
        fetchMock.mockReturnValue(
            new Promise(resolve => {
                resolveFetch = resolve;
            })
        );
        await startHttpProxy();

        const url = 'https://browser-intake-datadoghq.com/api/v2/rum';
        const request = requestListener({
            requestId: 'request-id',
            url,
            headers: '',
            body: '{}'
        });
        const startResource = jest.fn().mockResolvedValue(undefined);
        const stopResource = jest.fn().mockResolvedValue(undefined);
        const rum = { startResource, stopResource };
        patchCoreRumResourceTracking(rum);

        await rum.startResource('sdk-resource', 'POST', url);
        resolveFetch({ status: 202 });
        await request;
        await rum.stopResource('sdk-resource', 202, 'xhr');

        expect(startResource).not.toHaveBeenCalled();
        expect(stopResource).not.toHaveBeenCalled();
    });

    it('stops identifying a URL as internal when an upload fails', async () => {
        fetchMock.mockRejectedValue(new Error('network failure'));
        await startHttpProxy();

        await requestListener({
            requestId: 'request-id',
            url: 'https://proxy.example.com/upload',
            headers: '',
            body: '{}'
        });

        const startResource = jest.fn().mockResolvedValue(undefined);
        const rum = {
            startResource,
            stopResource: jest.fn().mockResolvedValue(undefined)
        };
        patchCoreRumResourceTracking(rum);
        await rum.startResource(
            'customer-resource',
            'POST',
            'https://proxy.example.com/upload'
        );

        expect(startResource).toHaveBeenCalled();
        expect(mockHttpResponse).toHaveBeenCalledWith('request-id', 0);
    });

    it('removes the request listener when stopped', async () => {
        const stop = await startHttpProxy();
        stop();
        expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it('contains failures when returning a response to native', async () => {
        mockHttpResponse.mockRejectedValueOnce(new Error('native unavailable'));
        await startHttpProxy();
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
        await expect(startHttpProxy()).resolves.toEqual(expect.any(Function));
        expect(mockAddListener).not.toHaveBeenCalled();
    });

    it('contains native module lookup failures', async () => {
        (getNativeDdSdk as jest.Mock).mockImplementationOnce(() => {
            throw new Error('native module failed to load');
        });
        await expect(startHttpProxy()).resolves.toEqual(expect.any(Function));
        expect(mockAddListener).not.toHaveBeenCalled();
    });

    it('contains listener registration failures', async () => {
        mockAddListener.mockImplementationOnce(() => {
            throw new Error('event emitter unavailable');
        });
        await expect(startHttpProxy()).resolves.toEqual(expect.any(Function));
    });

    it('registers the JS listener before enabling native uploads', async () => {
        mockStartHttpProxy.mockImplementationOnce(() => {
            expect(mockAddListener).toHaveBeenCalledWith(
                'ddHttpRequest',
                expect.any(Function)
            );
            return Promise.resolve();
        });
        await startHttpProxy();
        expect(mockStartHttpProxy).toHaveBeenCalledTimes(1);
    });

    it('removes the listener if the native handshake fails', async () => {
        mockStartHttpProxy.mockRejectedValueOnce(
            new Error('native transport unavailable')
        );
        await expect(startHttpProxy()).resolves.toEqual(expect.any(Function));
        expect(mockRemove).toHaveBeenCalledTimes(1);
    });
});
