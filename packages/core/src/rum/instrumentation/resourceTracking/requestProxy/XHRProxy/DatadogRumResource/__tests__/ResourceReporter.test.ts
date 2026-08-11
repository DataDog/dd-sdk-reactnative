/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { BufferSingleton } from '../../../../../../../sdk/DatadogProvider/Buffer/BufferSingleton';
import type { RUMResource } from '../../../interfaces/RumResource';
import { ResourceReporter } from '../ResourceReporter';

import { ResourceMockFactory } from './__utils__/ResourceMockFactory';

const resourceMockFactory = new ResourceMockFactory();
const DdRum = NativeModules.DdRum;
const flushPromises = () =>
    new Promise(jest.requireActual('timers').setImmediate);

beforeEach(() => {
    DdRum.startResource.mockClear();
    DdRum.stopResource.mockClear();
    BufferSingleton.onInitialization();
});

describe('Resource reporter', () => {
    it('reports resource when no mapper is passed', async () => {
        // GIVEN
        const resourceReporter = new ResourceReporter([]);
        const resource = resourceMockFactory.getBasicResource();

        // WHEN
        resourceReporter.reportResource(resource);
        await flushPromises();
        // THEN
        expect(DdRum.startResource).toHaveBeenCalledTimes(1);
        expect(DdRum.stopResource).toHaveBeenCalledTimes(1);
    });

    it('applies mappers when report resource is called', async () => {
        // GIVEN
        const setURLToGoogle = (resource: RUMResource) => {
            resource.request.url = 'https://google.com/';
            return resource;
        };
        const resourceReporter = new ResourceReporter([setURLToGoogle]);
        const resource = resourceMockFactory.getCustomResource({
            request: {
                method: 'GET',
                url: 'https://blabla.com',
                kind: 'xhr'
            }
        });

        // WHEN
        resourceReporter.reportResource(resource);
        await flushPromises();

        // THEN
        expect(DdRum.startResource).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            'https://google.com/',
            expect.anything(),
            expect.anything()
        );
        expect(DdRum.stopResource).toHaveBeenCalledTimes(1);
    });

    it('drops the resource when a mapper returns null', async () => {
        // GIVEN
        const discardResource = (resource: RUMResource) => {
            return null;
        };
        const resourceReporter = new ResourceReporter([discardResource]);
        const resource = resourceMockFactory.getBasicResource();

        // WHEN
        resourceReporter.reportResource(resource);
        await flushPromises();

        // THEN
        expect(DdRum.startResource).not.toHaveBeenCalled();
        expect(DdRum.stopResource).not.toHaveBeenCalled();
    });

    describe('captured header attributes in stopResource context', () => {
        it('includes _dd.request_headers in stopResource context when captured request headers are present', async () => {
            // GIVEN
            const resourceReporter = new ResourceReporter([]);
            const resource = resourceMockFactory.getCustomResource({
                capturedRequestHeaders: {
                    'content-type': 'application/json',
                    'cache-control': 'no-cache'
                }
            });

            // WHEN
            resourceReporter.reportResource(resource);
            await flushPromises();

            // THEN
            const stopContext = DdRum.stopResource.mock.calls[0][4];
            expect(stopContext).toEqual(
                expect.objectContaining({
                    '_dd.request_headers': {
                        'content-type': 'application/json',
                        'cache-control': 'no-cache'
                    }
                })
            );
        });

        it('includes _dd.response_headers in stopResource context when captured response headers are present', async () => {
            // GIVEN
            const resourceReporter = new ResourceReporter([]);
            const resource = resourceMockFactory.getCustomResource({
                capturedResponseHeaders: {
                    etag: '"abc123"',
                    'cache-control': 'max-age=3600'
                }
            });

            // WHEN
            resourceReporter.reportResource(resource);
            await flushPromises();

            // THEN
            const stopContext = DdRum.stopResource.mock.calls[0][4];
            expect(stopContext).toEqual(
                expect.objectContaining({
                    '_dd.response_headers': {
                        etag: '"abc123"',
                        'cache-control': 'max-age=3600'
                    }
                })
            );
        });

        it('includes both _dd.request_headers and _dd.response_headers when both are present', async () => {
            // GIVEN
            const resourceReporter = new ResourceReporter([]);
            const resource = resourceMockFactory.getCustomResource({
                capturedRequestHeaders: {
                    'content-type': 'text/plain'
                },
                capturedResponseHeaders: { 'x-cache': 'HIT' }
            });

            // WHEN
            resourceReporter.reportResource(resource);
            await flushPromises();

            // THEN
            const stopContext = DdRum.stopResource.mock.calls[0][4];
            expect(stopContext).toEqual(
                expect.objectContaining({
                    '_dd.request_headers': {
                        'content-type': 'text/plain'
                    },
                    '_dd.response_headers': { 'x-cache': 'HIT' }
                })
            );
        });

        it('does not include _dd.request_headers or _dd.response_headers when headers are undefined', async () => {
            // GIVEN
            const resourceReporter = new ResourceReporter([]);
            const resource = resourceMockFactory.getBasicResource();

            // WHEN
            resourceReporter.reportResource(resource);
            await flushPromises();

            // THEN
            const stopContext = DdRum.stopResource.mock.calls[0][4];
            expect(stopContext).not.toHaveProperty('_dd.request_headers');
            expect(stopContext).not.toHaveProperty('_dd.response_headers');
        });

        it('does not include _dd.request_headers when only response headers are present', async () => {
            // GIVEN
            const resourceReporter = new ResourceReporter([]);
            const resource = resourceMockFactory.getCustomResource({
                capturedResponseHeaders: {
                    'x-request-id': '12345'
                }
            });

            // WHEN
            resourceReporter.reportResource(resource);
            await flushPromises();

            // THEN
            const stopContext = DdRum.stopResource.mock.calls[0][4];
            expect(stopContext).toEqual(
                expect.objectContaining({
                    '_dd.response_headers': {
                        'x-request-id': '12345'
                    }
                })
            );
            expect(stopContext).not.toHaveProperty('_dd.request_headers');
        });
    });
});
