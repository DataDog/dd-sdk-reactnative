/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { BufferSingleton } from '../../../../sdk/DatadogProvider/Buffer/BufferSingleton';
import { PropagatorType } from '../../../types';
import { DdRumResourceTracking } from '../DdRumResourceTracking';
import { SAMPLING_PRIORITY_HEADER_KEY } from '../distributedTracing/distributedTracingHeaders';

import { XMLHttpRequestMock } from './__utils__/XMLHttpRequestMock';

const DdRum = NativeModules.DdRum;

const flushPromises = () =>
    new Promise(jest.requireActual('timers').setImmediate);

beforeEach(() => {
    DdRum.startResource.mockClear();
    DdRum.stopResource.mockClear();
    BufferSingleton.onInitialization();
    global.XMLHttpRequest = XMLHttpRequestMock;
});

afterEach(() => {
    global.XMLHttpRequest = undefined;
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
            tracingSamplingRate: 100,
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
            tracingSamplingRate: 100,
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

    describe('updateTrackingContext', () => {
        beforeEach(() => {
            // earlier tests in this file may leave tracking enabled — reset
            // so each updateTrackingContext test starts from a clean state.
            DdRumResourceTracking.stopTracking();
        });

        afterEach(() => {
            DdRumResourceTracking.stopTracking();
        });

        it('is a no-op when called before startTracking', async () => {
            // GIVEN tracking was never started

            // WHEN
            DdRumResourceTracking.updateTrackingContext({
                tracingSamplingRate: 100,
                firstPartyHosts: [
                    {
                        match: 'api.example.com',
                        propagatorTypes: [PropagatorType.DATADOG]
                    }
                ]
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
                tracingSamplingRate: 0,
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
                (xhrBeforeUpdate.requestHeaders as any)[
                    SAMPLING_PRIORITY_HEADER_KEY
                ]
            ).toBe('0');

            // WHEN
            DdRumResourceTracking.updateTrackingContext({
                tracingSamplingRate: 100,
                firstPartyHosts: [
                    {
                        match: 'api.example.com',
                        propagatorTypes: [PropagatorType.DATADOG]
                    }
                ]
            });

            // THEN: post-update request uses the new rate
            const xhrAfterUpdate = new XMLHttpRequestMock();
            xhrAfterUpdate.open('GET', 'https://api.example.com/v2/user');
            xhrAfterUpdate.send();
            expect(
                (xhrAfterUpdate.requestHeaders as any)[
                    SAMPLING_PRIORITY_HEADER_KEY
                ]
            ).toBe('1');
        });

        it('is a no-op after tracking has been stopped', async () => {
            // GIVEN
            DdRumResourceTracking.startTracking({
                tracingSamplingRate: 100,
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
                tracingSamplingRate: 100,
                firstPartyHosts: [
                    {
                        match: 'api.example.com',
                        propagatorTypes: [PropagatorType.DATADOG]
                    }
                ]
            });

            executeRequest('https://api.example.com/v2/user');
            await flushPromises();

            // THEN: tracking remains stopped, nothing captured
            expect(DdRum.startResource).not.toHaveBeenCalled();
            expect(DdRum.stopResource).not.toHaveBeenCalled();
        });
    });
});
