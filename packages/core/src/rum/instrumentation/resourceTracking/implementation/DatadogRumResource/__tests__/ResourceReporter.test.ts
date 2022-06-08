/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import type { RUMResource } from '../../../domain/interfaces/RumResource';
import { ResourceReporter } from '../ResourceReporter';

import { ResourceMockFactory } from './__utils__/ResourceMockFactory';

const resourceMockFactory = new ResourceMockFactory();
const DdRum = NativeModules.DdRum;
const flushPromises = () => new Promise(setImmediate);

beforeEach(() => {
    DdRum.startResource.mockClear();
    DdRum.stopResource.mockClear();
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
});
