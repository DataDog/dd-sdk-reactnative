/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { BufferSingleton } from '../../../../../../../sdk/DatadogProvider/Buffer/BufferSingleton';
import { DdRum as DdRumWrapper } from '../../../../../../DdRum';
import type { ResourceEventMapper } from '../../../../../../eventMappers/resourceEventMapper';
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
        const resourceReporter = new ResourceReporter(DdRumWrapper, []);
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
        const resourceReporter = new ResourceReporter(DdRumWrapper, [
            setURLToGoogle
        ]);
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

    it('uses resource context response URL from resource event mapper', async () => {
        // GIVEN
        const sanitizeURL: ResourceEventMapper = resource => {
            return {
                ...resource,
                resourceContext: {
                    responseURL: 'https://sanitized.example.com/'
                } as XMLHttpRequest
            };
        };
        const resourceReporter = new ResourceReporter(DdRumWrapper, [
            sanitizeURL
        ]);
        const resource = resourceMockFactory.getCustomResource({
            request: {
                method: 'GET',
                url: 'https://api.example.com/users/123',
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
            'https://sanitized.example.com/',
            expect.anything(),
            expect.anything()
        );
        expect(DdRum.stopResource).toHaveBeenCalledTimes(1);
    });

    it('builds the resource event mapper fields from the RUM resource', async () => {
        // GIVEN
        const inspectResourceEventMapper = jest.fn(resource => resource);
        const resourceReporter = new ResourceReporter(DdRumWrapper, [
            inspectResourceEventMapper
        ]);
        const resource = resourceMockFactory.getCustomResource({
            request: {
                method: 'GET',
                url: 'https://api.example.com/users/123',
                kind: 'xhr'
            },
            response: {
                statusCode: 201,
                size: 1234
            },
            timings: {
                startTime: 1000,
                stopTime: 1500
            }
        });

        // WHEN
        resourceReporter.reportResource(resource);
        await flushPromises();

        // THEN
        expect(inspectResourceEventMapper).toHaveBeenCalledWith(
            expect.objectContaining({
                key: resource.key,
                statusCode: resource.response.statusCode,
                kind: resource.request.kind,
                size: resource.response.size,
                context: {},
                timestampMs: resource.timings.stopTime,
                attributes: {}
            })
        );
        expect(DdRum.startResource).toHaveBeenCalledTimes(1);
        expect(DdRum.stopResource).toHaveBeenCalledTimes(1);
    });

    it('updates the resource event mapper while keeping existing resource mappers', async () => {
        // GIVEN
        const setURLToGoogle = (resource: RUMResource) => {
            resource.request.url = 'https://google.com/';
            return resource;
        };
        const sanitizeURL: ResourceEventMapper = resource => {
            return {
                ...resource,
                resourceContext: {
                    responseURL: 'https://sanitized.example.com/'
                } as XMLHttpRequest
            };
        };
        const resourceReporter = new ResourceReporter(DdRumWrapper, [
            setURLToGoogle
        ]);
        resourceReporter.setResourceEventMapper(sanitizeURL);

        // WHEN
        resourceReporter.reportResource(resourceMockFactory.getBasicResource());
        await flushPromises();

        // THEN
        expect(DdRum.startResource).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            'https://sanitized.example.com/',
            expect.anything(),
            expect.anything()
        );

        // WHEN
        DdRum.startResource.mockClear();
        DdRum.stopResource.mockClear();
        resourceReporter.setResourceEventMapper(undefined);
        resourceReporter.reportResource(resourceMockFactory.getBasicResource());
        await flushPromises();

        // THEN
        expect(DdRum.startResource).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            'https://google.com/',
            expect.anything(),
            expect.anything()
        );
    });

    it('drops the resource when a mapper returns null', async () => {
        // GIVEN
        const discardResource = (resource: RUMResource) => {
            return null;
        };
        const resourceReporter = new ResourceReporter(DdRumWrapper, [
            discardResource
        ]);
        const resource = resourceMockFactory.getBasicResource();

        // WHEN
        resourceReporter.reportResource(resource);
        await flushPromises();

        // THEN
        expect(DdRum.startResource).not.toHaveBeenCalled();
        expect(DdRum.stopResource).not.toHaveBeenCalled();
    });
});
