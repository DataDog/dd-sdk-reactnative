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
import { DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER } from '../../../graphql/graphqlHeaders';
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
    headers = {}
}: {
    status?: number;
    headers?: Record<string, string>;
} = {}) => {
    return ({
        status,
        headers: new HeadersMock(headers)
    } as unknown) as Response;
};

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
});
