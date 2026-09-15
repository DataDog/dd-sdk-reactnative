/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { BufferSingleton } from '../../../../sdk/DatadogProvider/Buffer/BufferSingleton';
import { PropagatorType } from '../../../types';
import { DdRumResourceTracking } from '../DdRumResourceTracking';
import { SAMPLING_PRIORITY_HEADER_KEY } from '../distributedTracing/headers';

import { XMLHttpRequestMock } from './__utils__/XMLHttpRequestMock';

const DdRum = NativeModules.DdRum;
const originalFetch = global.fetch;

const flushPromises = () =>
    new Promise(jest.requireActual('timers').setImmediate);

beforeEach(() => {
    DdRum.startResource.mockClear();
    DdRum.stopResource.mockClear();
    BufferSingleton.onInitialization();
    global.XMLHttpRequest = XMLHttpRequestMock;
});

afterEach(() => {
    DdRumResourceTracking.stopTracking();
    global.XMLHttpRequest = undefined;
    global.fetch = originalFetch;
});

const executeRequest = (url: string = 'https://api.example.com/v2/user') => {
    const xhr = new XMLHttpRequestMock();
    xhr.open('GET', url);
    xhr.send();
    xhr.notifyResponseArrived();
    xhr.complete(200, 'ok');
};

describe('DdRumResourceTracking', () => {
    it('removes all side effects when tracking is stopped', async () => {
        // GIVEN
        global.XMLHttpRequest = XMLHttpRequestMock;
        DdRumResourceTracking.startTracking({
            resourceTraceSampleRate: 100,
            firstPartyHosts: [
                {
                    match: 'example.com',
                    propagatorTypes: [PropagatorType.DATADOG]
                }
            ]
        });

        // WHEN
        executeRequest();
        await flushPromises();

        // THEN
        expect(DdRum.startResource).toHaveBeenCalledTimes(1);
        expect(DdRum.stopResource).toHaveBeenCalledTimes(1);

        // WHEN
        DdRum.startResource.mockClear();
        DdRum.stopResource.mockClear();
        DdRumResourceTracking.stopTracking();
        executeRequest();

        // THEN
        expect(DdRum.startResource).toHaveBeenCalledTimes(0);
        expect(DdRum.stopResource).toHaveBeenCalledTimes(0);
    });

    it('does not report the resource when it is an internal resource', async () => {
        // GIVEN
        global.XMLHttpRequest = XMLHttpRequestMock;
        DdRumResourceTracking.startTracking({
            resourceTraceSampleRate: 100,
            firstPartyHosts: [
                {
                    match: 'example.com',
                    propagatorTypes: [PropagatorType.DATADOG]
                }
            ]
        });

        // WHEN
        executeRequest('http://192.168.1.20:8081/logs');
        await flushPromises();

        // THEN
        expect(DdRum.startResource).not.toHaveBeenCalled();
        expect(DdRum.stopResource).not.toHaveBeenCalled();
    });

    it('tracks Expo Fetch and XHR resources when Fetch tracking is enabled', async () => {
        const fetchResponse = ({
            status: 200,
            headers: {
                get: (header: string) =>
                    header.toLowerCase() === 'content-length' ? '12' : null
            }
        } as unknown) as Response;
        const expoFetch = jest
            .fn()
            .mockResolvedValue(fetchResponse) as jest.MockedFunction<
            typeof fetch
        >;
        global.fetch = expoFetch;
        DdRumResourceTracking.startTracking({
            resourceTraceSampleRate: 100,
            firstPartyHosts: [],
            trackFetchResources: true
        });

        executeRequest();
        await global.fetch('https://api.example.com/v2/user');
        await flushPromises();

        expect(DdRum.startResource).toHaveBeenCalledTimes(2);
        expect(DdRum.stopResource).toHaveBeenCalledTimes(2);
        expect(DdRum.stopResource.mock.calls.map(call => call[2])).toEqual(
            expect.arrayContaining(['xhr', 'fetch'])
        );
        expect(expoFetch).toHaveBeenCalledTimes(1);
    });

    it('tracks a native Fetch implementation without relying on an Expo marker', () => {
        const fetchImplementation = jest.fn() as jest.MockedFunction<
            typeof fetch
        >;
        global.fetch = fetchImplementation;

        DdRumResourceTracking.startTracking({
            resourceTraceSampleRate: 100,
            firstPartyHosts: [],
            trackFetchResources: true
        });

        expect(global.fetch).not.toBe(fetchImplementation);
    });

    it('does not wrap Expo Fetch when Fetch tracking is disabled', () => {
        const expoFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
        global.fetch = expoFetch;

        DdRumResourceTracking.startTracking({
            resourceTraceSampleRate: 100,
            firstPartyHosts: []
        });

        expect(global.fetch).toBe(expoFetch);
    });

    it('does not double report an XHR-backed Fetch and still tracks direct XHR', async () => {
        const fetchResponse = ({
            status: 200,
            headers: { get: () => null }
        } as unknown) as Response;
        const xhrBackedFetch = jest.fn(
            (input: RequestInfo | URL, init?: RequestInit) => {
                const xhr = new XMLHttpRequestMock();
                xhr.open(init?.method ?? 'GET', String(input));
                new Headers(init?.headers).forEach((value, header) => {
                    xhr.setRequestHeader(header, value);
                });
                xhr.send();
                xhr.notifyResponseArrived();
                xhr.complete(200, 'ok');
                return Promise.resolve(fetchResponse);
            }
        ) as jest.MockedFunction<typeof fetch>;
        global.fetch = xhrBackedFetch;

        DdRumResourceTracking.startTracking({
            resourceTraceSampleRate: 100,
            firstPartyHosts: [],
            trackFetchResources: true
        });

        await global.fetch('https://api.example.com/fetch');
        executeRequest('https://api.example.com/xhr');
        await flushPromises();

        expect(global.fetch).not.toBe(xhrBackedFetch);
        expect(xhrBackedFetch).toHaveBeenCalledTimes(1);
        expect(DdRum.startResource).toHaveBeenCalledTimes(2);
        expect(DdRum.stopResource).toHaveBeenCalledTimes(2);
        expect(DdRum.stopResource.mock.calls.map(call => call[2])).toEqual(
            expect.arrayContaining(['fetch', 'xhr'])
        );
    });

    describe('updateTrackingContext', () => {
        beforeEach(() => {
            DdRumResourceTracking.stopTracking();
        });

        afterEach(() => {
            DdRumResourceTracking.stopTracking();
        });

        it('is a no-op when called before startTracking', async () => {
            // GIVEN tracking was never started

            // WHEN
            DdRumResourceTracking.updateTrackingContext({
                resourceTraceSampleRate: 100
            });

            executeRequest('https://api.example.com/v2/user');
            await flushPromises();

            // THEN: no XHR proxy was installed; no resource events captured
            expect(DdRum.startResource).not.toHaveBeenCalled();
            expect(DdRum.stopResource).not.toHaveBeenCalled();
        });

        it('applies the updated sampling rate to subsequent requests', () => {
            // GIVEN tracking installed with rate=0
            DdRumResourceTracking.startTracking({
                resourceTraceSampleRate: 0,
                firstPartyHosts: [
                    {
                        match: 'api.example.com',
                        propagatorTypes: [PropagatorType.DATADOG]
                    }
                ]
            });

            // pre-update request gets sampling priority '0'
            const xhrBeforeUpdate = new XMLHttpRequestMock();
            xhrBeforeUpdate.open('GET', 'https://api.example.com/v2/user');
            xhrBeforeUpdate.send();
            expect(
                xhrBeforeUpdate.requestHeaders.get(SAMPLING_PRIORITY_HEADER_KEY)
            ).toBe('0');

            // WHEN
            DdRumResourceTracking.updateTrackingContext({
                resourceTraceSampleRate: 100
            });

            // THEN: post-update request uses the new rate
            const xhrAfterUpdate = new XMLHttpRequestMock();
            xhrAfterUpdate.open('GET', 'https://api.example.com/v2/user');
            xhrAfterUpdate.send();
            expect(
                xhrAfterUpdate.requestHeaders.get(SAMPLING_PRIORITY_HEADER_KEY)
            ).toBe('1');
        });

        it('is a no-op after tracking has been stopped', async () => {
            // GIVEN
            DdRumResourceTracking.startTracking({
                resourceTraceSampleRate: 100,
                firstPartyHosts: [
                    {
                        match: 'api.example.com',
                        propagatorTypes: [PropagatorType.DATADOG]
                    }
                ]
            });
            DdRumResourceTracking.stopTracking();

            // WHEN
            DdRumResourceTracking.updateTrackingContext({
                resourceTraceSampleRate: 100
            });

            executeRequest('https://api.example.com/v2/user');
            await flushPromises();

            // THEN: tracking remains stopped, nothing captured
            expect(DdRum.startResource).not.toHaveBeenCalled();
            expect(DdRum.stopResource).not.toHaveBeenCalled();
        });
    });
});
