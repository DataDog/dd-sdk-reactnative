/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { filterDevResource } from '../internalDevResourceBlocklist';

import { ResourceMockFactory } from './__utils__/ResourceMockFactory';

const resourceMockFactory = new ResourceMockFactory();

describe('internalDevResourceBlocklist', () => {
    describe('filterDevResource', () => {
        it.each(['192.168.1.20', '10.46.29.155', '172.28.1.20', '127.0.0.1'])(
            'returns null when a expo logs call with ip %s is made',
            ip => {
                const resource = resourceMockFactory.getCustomResource({
                    request: {
                        method: 'GET',
                        url: `http://${ip}:8081/logs`,
                        kind: 'xhr'
                    }
                });
                expect(filterDevResource(resource)).toBeNull();
            }
        );
        it('returns the event when an expo logs call with custom port is made', () => {
            const resource = resourceMockFactory.getCustomResource({
                request: {
                    method: 'GET',
                    url: 'http://10.46.29.155:19000/logs',
                    kind: 'xhr'
                }
            });
            expect(filterDevResource(resource)).not.toBeNull();
        });
        it('returns null when a rn symbolicate call is made', () => {
            const resource = resourceMockFactory.getCustomResource({
                request: {
                    method: 'GET',
                    url: 'http://localhost:8081/symbolicate',
                    kind: 'xhr'
                }
            });
            expect(filterDevResource(resource)).toBeNull();
        });
        it('returns the event when an rn symbolicate call with custom port is made', () => {
            const resource = resourceMockFactory.getCustomResource({
                request: {
                    method: 'GET',
                    url: 'http://localhost:40/symbolicate',
                    kind: 'xhr'
                }
            });
            expect(filterDevResource(resource)).not.toBeNull();
        });
        it('returns the resource when the resource is not a dev resource', () => {
            const resource = resourceMockFactory.getCustomResource({
                request: {
                    method: 'GET',
                    url: 'http://11.22.33.22:443/logs',
                    kind: 'xhr'
                }
            });
            expect(filterDevResource(resource)).not.toBeNull();
        });
    });
});
