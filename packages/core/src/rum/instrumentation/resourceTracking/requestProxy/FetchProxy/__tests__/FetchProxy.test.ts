/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { PropagatorType } from '../../../../../types';
import { firstPartyHostsRegexMapBuilder } from '../../../distributedTracing/firstPartyHosts';
import {
    PARENT_ID_HEADER_KEY,
    SAMPLING_PRIORITY_HEADER_KEY,
    TRACKED_BY_HEADER_KEY,
    TRACKED_BY_HEADER_VALUE
} from '../../../distributedTracing/headers';
import {
    DATADOG_GRAPH_QL_ERROR_HEADER,
    DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER
} from '../../../graphql/graphqlHeaders';
import type { ResourceReporter } from '../../common/ResourceReporter';
import type { RUMResource } from '../../interfaces/RumResource';
import { FetchProxy } from '../FetchProxy';

class HeadersMock {
    private values = new Map<string, string>();

    constructor(init?: HeadersInit) {
        if (init instanceof HeadersMock) {
            init.forEach((value, header) => this.set(header, value));
        } else if (Array.isArray(init)) {
            init.forEach(([header, value]) => this.set(header, value));
        } else if (init && typeof init === 'object' && 'forEach' in init) {
            (init as Headers).forEach((value, header) =>
                this.set(header, value)
            );
        } else if (init) {
            Object.entries(init).forEach(([header, value]) =>
                this.set(header, value)
            );
        }
    }

    delete(header: string) {
        this.values.delete(header.toLowerCase());
    }

    forEach(callback: (value: string, header: string) => void) {
        this.values.forEach((value, header) => callback(value, header));
    }

    get(header: string): string | null {
        return this.values.get(header.toLowerCase()) ?? null;
    }

    set(header: string, value: string) {
        this.values.set(header.toLowerCase(), String(value));
    }
}

const getOptions = (traceSampleRate = 100) => ({
    tracingSamplingRate: traceSampleRate,
    firstPartyHostsRegexMap: firstPartyHostsRegexMapBuilder([
        {
            match: 'api.example.com',
            propagatorTypes: [PropagatorType.DATADOG]
        }
    ])
});

const createResponse = ({
    status = 200,
    headers = {},
    body
}: {
    status?: number;
    headers?: Record<string, string>;
    body?: unknown;
} = {}) => {
    const response = ({
        status,
        headers: new HeadersMock(headers),
        clone() {
            return response;
        },
        json: () => Promise.resolve(body)
    } as unknown) as Response;

    return response;
};

const flushPromises = () =>
    new Promise(jest.requireActual('timers').setImmediate);

const createProxy = ({
    originalFetch,
    reportResource
}: {
    originalFetch: typeof fetch;
    reportResource: jest.Mock;
}) => {
    const fetchGlobal = { fetch: originalFetch };
    const proxy = new FetchProxy({
        fetchGlobal,
        headersType: (HeadersMock as unknown) as typeof Headers,
        resourceReporter: ({
            reportResource
        } as unknown) as ResourceReporter
    });

    return { fetchGlobal, proxy };
};

describe('FetchProxy', () => {
    it('reports a successful Fetch resource without replacing the response', async () => {
        const response = createResponse({
            status: 201,
            headers: { 'content-length': '42' }
        });
        const originalFetch = jest
            .fn()
            .mockResolvedValue(response) as jest.MockedFunction<typeof fetch>;
        const reportResource = jest.fn();
        const { fetchGlobal, proxy } = createProxy({
            originalFetch,
            reportResource
        });
        proxy.onTrackingStart(getOptions());

        const result = await fetchGlobal.fetch(
            'https://api.example.com/users',
            {
                method: 'post'
            }
        );

        expect(result).toBe(response);
        expect(reportResource).toHaveBeenCalledTimes(1);
        expect(reportResource).toHaveBeenCalledWith(
            expect.objectContaining({
                request: {
                    method: 'POST',
                    url: 'https://api.example.com/users',
                    kind: 'fetch'
                },
                response: {
                    statusCode: 201,
                    size: 42
                }
            })
        );

        const outgoingHeaders = (originalFetch.mock.calls[0][1]
            ?.headers as unknown) as HeadersMock;
        expect(outgoingHeaders.get(TRACKED_BY_HEADER_KEY)).toBe(
            TRACKED_BY_HEADER_VALUE
        );
        expect(outgoingHeaders.get(SAMPLING_PRIORITY_HEADER_KEY)).toBe('1');
        expect(outgoingHeaders.get(PARENT_ID_HEADER_KEY)).not.toBeNull();
    });

    it('extracts GraphQL metadata and removes its internal header', async () => {
        const originalFetch = jest
            .fn()
            .mockResolvedValue(createResponse()) as jest.MockedFunction<
            typeof fetch
        >;
        const reportResource = jest.fn();
        const { fetchGlobal, proxy } = createProxy({
            originalFetch,
            reportResource
        });
        proxy.onTrackingStart(getOptions());

        await fetchGlobal.fetch('https://api.example.com/graphql', {
            headers: {
                [DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER]: 'query',
                accept: 'application/json'
            }
        });

        const resource = reportResource.mock.calls[0][0] as RUMResource;
        expect(resource.graphqlAttributes?.operationType).toBe('query');
        const outgoingHeaders = (originalFetch.mock.calls[0][1]
            ?.headers as unknown) as HeadersMock;
        expect(
            outgoingHeaders.get(DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER)
        ).toBeNull();
        expect(outgoingHeaders.get('accept')).toBe('application/json');
    });

    it('reports a failed resource and rethrows the original rejection', async () => {
        const rejection = new Error('network failed');
        const originalFetch = jest
            .fn()
            .mockRejectedValue(rejection) as jest.MockedFunction<typeof fetch>;
        const reportResource = jest.fn();
        const { fetchGlobal, proxy } = createProxy({
            originalFetch,
            reportResource
        });
        proxy.onTrackingStart(getOptions());

        await expect(
            fetchGlobal.fetch('https://api.example.com/users')
        ).rejects.toBe(rejection);
        expect(reportResource).toHaveBeenCalledWith(
            expect.objectContaining({
                response: {
                    statusCode: 0,
                    size: -1
                }
            })
        );
    });

    it('applies sampling updates to subsequent Fetch requests', async () => {
        const originalFetch = jest
            .fn()
            .mockResolvedValue(createResponse()) as jest.MockedFunction<
            typeof fetch
        >;
        const { fetchGlobal, proxy } = createProxy({
            originalFetch,
            reportResource: jest.fn()
        });
        proxy.onTrackingStart(getOptions(0));
        proxy.onTrackingUpdate({ tracingSamplingRate: 100 });

        await fetchGlobal.fetch('https://api.example.com/users');

        const outgoingHeaders = (originalFetch.mock.calls[0][1]
            ?.headers as unknown) as HeadersMock;
        expect(outgoingHeaders.get(SAMPLING_PRIORITY_HEADER_KEY)).toBe('1');
    });

    it('restores the original Fetch when tracking stops', () => {
        const originalFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
        const { fetchGlobal, proxy } = createProxy({
            originalFetch,
            reportResource: jest.fn()
        });
        proxy.onTrackingStart(getOptions());

        expect(fetchGlobal.fetch).not.toBe(originalFetch);
        proxy.onTrackingStop();

        expect(fetchGlobal.fetch).toBe(originalFetch);
    });

    it('does not overwrite a Fetch wrapper installed after Datadog', () => {
        const originalFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
        const { fetchGlobal, proxy } = createProxy({
            originalFetch,
            reportResource: jest.fn()
        });
        proxy.onTrackingStart(getOptions());
        const laterFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
        fetchGlobal.fetch = laterFetch;

        proxy.onTrackingStop();

        expect(fetchGlobal.fetch).toBe(laterFetch);
    });

    it('keeps a Fetch wrapper retained by another library callable after tracking stops', async () => {
        const response = createResponse();
        const originalFetch = jest
            .fn()
            .mockResolvedValue(response) as jest.MockedFunction<typeof fetch>;
        const { fetchGlobal, proxy } = createProxy({
            originalFetch,
            reportResource: jest.fn()
        });
        proxy.onTrackingStart(getOptions());

        // Another library installs its own wrapper after Datadog, capturing
        // Datadog's installed Fetch as its own "original" delegate.
        const capturedDatadogFetch = fetchGlobal.fetch;
        fetchGlobal.fetch = ((input, init) =>
            capturedDatadogFetch(input, init)) as typeof fetch;

        proxy.onTrackingStop();

        await expect(
            capturedDatadogFetch('https://api.example.com/users')
        ).resolves.toBe(response);
    });

    describe('GraphQL error filtering', () => {
        it('extracts GraphQL errors from the response body when error tracking is enabled', async () => {
            const graphqlResponse = {
                data: { user: null },
                errors: [
                    {
                        message: 'User not found',
                        locations: [{ line: 2, column: 3 }],
                        path: ['user', 0, 'id'],
                        extensions: { code: 'NOT_FOUND' }
                    }
                ]
            };
            const originalFetch = jest
                .fn()
                .mockResolvedValue(
                    createResponse({ body: graphqlResponse })
                ) as jest.MockedFunction<typeof fetch>;
            const reportResource = jest.fn();
            const { fetchGlobal, proxy } = createProxy({
                originalFetch,
                reportResource
            });
            proxy.onTrackingStart(getOptions());

            await fetchGlobal.fetch('https://api.example.com/graphql', {
                headers: {
                    [DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER]: 'query',
                    [DATADOG_GRAPH_QL_ERROR_HEADER]: 'true'
                }
            });
            await flushPromises();

            const resource = reportResource.mock.calls[0][0] as RUMResource;
            expect(resource.graphqlAttributes?.errors).toEqual([
                {
                    message: 'User not found',
                    code: 'NOT_FOUND',
                    locations: [{ line: 2, column: 3 }],
                    path: ['user', 0, 'id']
                }
            ]);
        });

        it('reports without errors when the Fetch implementation does not support clone()', async () => {
            // Some Fetch implementations (e.g. `expo/fetch` prior to Expo SDK
            // 56) throw on `response.clone()`.
            const response = createResponse({ body: { data: {} } });
            response.clone = () => {
                throw new Error('Not implemented');
            };
            const originalFetch = jest
                .fn()
                .mockResolvedValue(response) as jest.MockedFunction<
                typeof fetch
            >;
            const reportResource = jest.fn();
            const { fetchGlobal, proxy } = createProxy({
                originalFetch,
                reportResource
            });
            proxy.onTrackingStart(getOptions());

            await expect(
                fetchGlobal.fetch('https://api.example.com/graphql', {
                    headers: {
                        [DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER]: 'query',
                        [DATADOG_GRAPH_QL_ERROR_HEADER]: 'true'
                    }
                })
            ).resolves.toBe(response);
            await flushPromises();

            const resource = reportResource.mock.calls[0][0] as RUMResource;
            expect(resource.graphqlAttributes?.operationType).toBe('query');
            expect(resource.graphqlAttributes?.errors).toBeUndefined();
        });

        it('does not read the response body when error tracking is disabled', async () => {
            const response = createResponse({ body: { data: {} } });
            const cloneSpy = jest.spyOn(response, 'clone');
            const originalFetch = jest
                .fn()
                .mockResolvedValue(response) as jest.MockedFunction<
                typeof fetch
            >;
            const reportResource = jest.fn();
            const { fetchGlobal, proxy } = createProxy({
                originalFetch,
                reportResource
            });
            proxy.onTrackingStart(getOptions());

            await fetchGlobal.fetch('https://api.example.com/graphql', {
                headers: {
                    [DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER]: 'query'
                }
            });
            await flushPromises();

            expect(cloneSpy).not.toHaveBeenCalled();
            const resource = reportResource.mock.calls[0][0] as RUMResource;
            expect(resource.graphqlAttributes?.errors).toBeUndefined();
        });
    });
});
