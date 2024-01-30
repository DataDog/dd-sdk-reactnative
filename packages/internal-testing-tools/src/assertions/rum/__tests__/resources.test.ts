import { buildRumResourceAssertions } from '../resource';

import { mockRumResource } from './__utils__/resources.mock';

describe('resources assertions', () => {
    describe('toHaveResourceWith', () => {
        it('does not throw if it contains an resource with correct method and url', () => {
            const resources = [
                mockRumResource({}),
                mockRumResource({
                    url: 'https://example.com',
                    method: 'POST'
                })
            ];
            const resourceAssertions = buildRumResourceAssertions(resources);
            expect(() =>
                resourceAssertions.toHaveResourceWith({
                    url: 'https://example.com',
                    method: 'POST'
                })
            ).not.toThrow();
        });
        it('does not throw if it contains an resource with correct url', () => {
            const resources = [
                mockRumResource({}),
                mockRumResource({
                    url: 'https://my-api.com',
                    method: 'PUT'
                })
            ];
            const resourceAssertions = buildRumResourceAssertions(resources);
            expect(() =>
                resourceAssertions.toHaveResourceWith({
                    url: 'https://my-api.com'
                })
            ).not.toThrow();
        });
        it('does not throw if it contains an resource with correct method', () => {
            const resources = [
                mockRumResource({}),
                mockRumResource({
                    url: 'https://my-api.com',
                    method: 'PUT'
                })
            ];
            const resourceAssertions = buildRumResourceAssertions(resources);
            expect(() =>
                resourceAssertions.toHaveResourceWith({
                    method: 'PUT'
                })
            ).not.toThrow();
        });

        it('throws if it does not contain an resource with correct method and url', () => {
            const resources = [
                mockRumResource({}),
                mockRumResource({
                    url: 'https://my-api.com',
                    method: 'PUT'
                })
            ];
            const resourceAssertions = buildRumResourceAssertions(resources);
            expect(() =>
                resourceAssertions.toHaveResourceWith({
                    url: 'https://my-api.com',
                    method: 'PATCH'
                })
            ).toThrow();
            expect(() =>
                resourceAssertions.toHaveResourceWith({
                    url: 'Crash',
                    method: 'PUT'
                })
            ).toThrow();
        });
        it('throws if it does not contain an resource with correct url', () => {
            const resources = [
                mockRumResource({}),
                mockRumResource({
                    url: 'https://my-api.com',
                    method: 'PUT'
                })
            ];
            const resourceAssertions = buildRumResourceAssertions(resources);
            expect(() =>
                resourceAssertions.toHaveResourceWith({
                    url: 'crash'
                })
            ).toThrow();
        });
        it('throws if it does not contain an resource with correct method', () => {
            const resources = [
                mockRumResource({}),
                mockRumResource({
                    url: 'https://my-api.com',
                    method: 'PUT'
                })
            ];
            const resourceAssertions = buildRumResourceAssertions(resources);
            expect(() =>
                resourceAssertions.toHaveResourceWith({
                    method: 'PATCH'
                })
            ).toThrow();
        });
        it('throws if no method or url were provided ', () => {
            const resources = [
                mockRumResource({}),
                mockRumResource({
                    url: 'https://my-api.com',
                    method: 'PUT'
                })
            ];
            const resourceAssertions = buildRumResourceAssertions(resources);
            expect(() => resourceAssertions.toHaveResourceWith({})).toThrow();
        });
    });
});
