/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { OpenFeature } from '@openfeature/web-sdk';

import { version } from '../../package.json';
import { DatadogCoreProvider, fetchRulesConfiguration } from '../rules-based';
import type { RulesConfigurationFetchOptions } from '../rules-based';

import { matchingContext, rulesWire } from './__utils__/coreConfiguration';

jest.mock('@datadog/mobile-react-native', () => {
    throw new Error('Fetching rules must not load the native SDK');
});

const options: RulesConfigurationFetchOptions = {
    clientToken: 'test-client-token',
    env: 'production'
};
const rulesBytes = Uint8Array.from(
    Buffer.from(JSON.parse(rulesWire).rules.response, 'base64')
);

function response(overrides: Partial<Response> = {}): Response {
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/protobuf' }),
        arrayBuffer: jest.fn(async () => rulesBytes.buffer),
        ...overrides
    } as Response;
}

describe('fetchRulesConfiguration', () => {
    afterEach(async () => {
        await OpenFeature.clearProviders();
        await OpenFeature.clearContext();
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it('fetches and decodes client rules with RN headers and a retrieval timestamp', async () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-10-20T12:00:00Z'));
        const fetch = jest.fn().mockResolvedValue(response());
        const configuration = await fetchRulesConfiguration({
            ...options,
            fetch
        });

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(
            'https://ufc-client.ff-cdn.datadoghq.com/api/v2/feature-flagging/config/rules-based/client?dd_env=production',
            {
                method: 'GET',
                headers: {
                    Accept: 'application/protobuf',
                    'dd-client-token': 'test-client-token',
                    'DD-Client-Library-Language': 'react-native',
                    'DD-Client-Library-Version': version
                },
                signal: undefined
            }
        );
        expect(configuration.rules?.fetchedAt).toBe(Date.now());
        expect(configuration.rules?.response).toBeDefined();
        expect(configuration.precomputed).toBeUndefined();
        expect(jest.getTimerCount()).toBe(0);
    });

    it.each([
        'datadoghq.com',
        'us3.datadoghq.com',
        'us5.datadoghq.com',
        'ap1.datadoghq.com',
        'ap2.datadoghq.com',
        'uk1.datadoghq.com',
        'datadoghq.eu',
        'datad0g.com'
    ])('uses the client rules endpoint for %s', async site => {
        const fetch = jest.fn().mockResolvedValue(response());
        await fetchRulesConfiguration({ ...options, site, fetch });
        expect(fetch.mock.calls[0][0]).toBe(
            `https://ufc-client.ff-cdn.${site}/api/v2/feature-flagging/config/rules-based/client?dd_env=production`
        );
    });

    it.each([
        'ddog-gov.com',
        'US1',
        '',
        'https://datadoghq.com',
        'datadoghq.com.attacker.example',
        'datadoghq.com@attacker.example',
        'datadoghq.com/path'
    ])(
        'rejects unsupported sites before sending the client token: %s',
        async site => {
            const fetch = jest.fn();
            await expect(
                fetchRulesConfiguration({ ...options, site, fetch })
            ).rejects.toThrow('Unsupported site');
            expect(fetch).not.toHaveBeenCalled();
        }
    );

    it('encodes the environment without requiring a URL polyfill', async () => {
        jest.spyOn(globalThis, 'URL').mockImplementation(() => {
            throw new Error('URL is unavailable');
        });
        jest.spyOn(globalThis, 'URLSearchParams').mockImplementation(() => {
            throw new Error('URLSearchParams is unavailable');
        });
        const fetch = jest.fn().mockResolvedValue(response());
        await fetchRulesConfiguration({
            ...options,
            env: 'QA & dogfood/#?=+\u00e9',
            fetch
        });
        expect(fetch.mock.calls[0][0]).toBe(
            `https://ufc-client.ff-cdn.datadoghq.com/api/v2/feature-flagging/config/rules-based/client?dd_env=${encodeURIComponent(
                'QA & dogfood/#?=+\u00e9'
            )}`
        );
    });

    it('uses global fetch by default and forwards an abort signal', async () => {
        const fetch = jest
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(response());
        const controller = new AbortController();
        await fetchRulesConfiguration({
            ...options,
            signal: controller.signal
        });
        expect(fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ signal: controller.signal })
        );
    });

    it.each(['application/json', 'application/vnd.api+json; charset=utf-8'])(
        'reports an HTTP error from %s without decoding rules',
        async contentType => {
            const failed = response({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
                headers: new Headers({ 'content-type': contentType }),
                json: jest.fn().mockResolvedValue({
                    errors: [{ detail: 'Invalid client token' }]
                })
            });
            const fetch = jest.fn().mockResolvedValue(failed);
            await expect(
                fetchRulesConfiguration({ ...options, fetch })
            ).rejects.toThrow(
                'Failed to fetch flag configuration: Invalid client token'
            );
            expect(failed.arrayBuffer).not.toHaveBeenCalled();
            expect(fetch).toHaveBeenCalledTimes(1);
        }
    );

    it.each([null, {}, { errors: [] }, { errors: [{ detail: 42 }] }])(
        'preserves the HTTP status for an unrecognized error body: %j',
        async body => {
            const fetch = jest.fn().mockResolvedValue(
                response({
                    ok: false,
                    status: 503,
                    statusText: '',
                    headers: new Headers({
                        'content-type': 'application/json'
                    }),
                    json: jest.fn().mockResolvedValue(body)
                })
            );
            await expect(
                fetchRulesConfiguration({ ...options, fetch })
            ).rejects.toThrow('Failed to fetch flag configuration: HTTP 503');
        }
    );

    it('preserves an HTTP failure when its JSON error body cannot be read', async () => {
        const fetch = jest.fn().mockResolvedValue(
            response({
                ok: false,
                status: 502,
                statusText: 'Bad Gateway',
                headers: new Headers({ 'content-type': 'application/json' }),
                json: jest
                    .fn()
                    .mockRejectedValue(new SyntaxError('Invalid JSON'))
            })
        );
        await expect(
            fetchRulesConfiguration({ ...options, fetch })
        ).rejects.toThrow('Failed to fetch flag configuration: Bad Gateway');
    });

    it.each(['network', 'abort'])(
        'propagates a %s rejection without retrying',
        async kind => {
            const error = new Error(kind);
            error.name = kind === 'abort' ? 'AbortError' : 'TypeError';
            const fetch = jest.fn().mockRejectedValue(error);
            const controller = new AbortController();
            if (kind === 'abort') {
                controller.abort();
            }
            await expect(
                fetchRulesConfiguration({
                    ...options,
                    fetch,
                    signal: controller.signal
                })
            ).rejects.toBe(error);
            expect(fetch).toHaveBeenCalledTimes(1);
        }
    );

    it('rejects unreadable and malformed protobuf bodies', async () => {
        const error = new Error('Unable to read response');
        const fetch = jest
            .fn()
            .mockResolvedValueOnce(
                response({ arrayBuffer: jest.fn().mockRejectedValue(error) })
            )
            .mockResolvedValueOnce(
                response({
                    arrayBuffer: jest
                        .fn()
                        .mockResolvedValue(new Uint8Array([255]).buffer)
                })
            );
        await expect(
            fetchRulesConfiguration({ ...options, fetch })
        ).rejects.toBe(error);
        await expect(
            fetchRulesConfiguration({ ...options, fetch })
        ).rejects.toThrow();
    });

    it('evaluates fetched rules locally and preserves them after a failed explicit refresh', async () => {
        const fetch = jest.fn().mockResolvedValue(response());
        const provider = new DatadogCoreProvider();
        const configuration = await fetchRulesConfiguration({
            ...options,
            fetch
        });
        provider.setConfiguration(configuration);
        await OpenFeature.setProviderAndWait(
            'fetched-rules',
            provider,
            matchingContext
        );
        const client = OpenFeature.getClient('fetched-rules');
        expect(client.getBooleanValue('test-flag', false)).toBe(true);
        await OpenFeature.setContext('fetched-rules', {
            targetingKey: 'user-2',
            country: 'CA'
        });
        expect(client.getBooleanValue('test-flag', true)).toBe(false);
        expect(fetch).toHaveBeenCalledTimes(1);

        const failure = new Error('Offline');
        fetch.mockRejectedValueOnce(failure);
        const refresh = async () => {
            provider.setConfiguration(
                await fetchRulesConfiguration({ ...options, fetch })
            );
        };
        await expect(refresh()).rejects.toBe(failure);
        expect(provider.getConfiguration()).toBe(configuration);
        expect(client.getBooleanValue('test-flag', true)).toBe(false);
        expect(fetch).toHaveBeenCalledTimes(2);
    });
});
