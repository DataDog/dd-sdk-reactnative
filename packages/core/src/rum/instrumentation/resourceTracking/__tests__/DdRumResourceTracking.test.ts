/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { BufferSingleton } from '../../../../DatadogProvider/Buffer/BufferSingleton';
import { DdRumResourceTracking } from '../DdRumResourceTracking';

import { XMLHttpRequestMock } from './__utils__/XMLHttpRequestMock';

const DdRum = NativeModules.DdRum;

const flushPromises = () => new Promise(setImmediate);

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
            firstPartyHosts: ['example.com']
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
            firstPartyHosts: ['example.com']
        });

        // WHEN
        executeRequest('http://192.168.1.20:8081/logs');
        await flushPromises();

        // THEN
        expect(DdRum.startResource).not.toHaveBeenCalled();
        expect(DdRum.stopResource).not.toHaveBeenCalled();
    });
});
