/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { OpenFeature } from '@openfeature/web-sdk';
import { URL as NodeURL } from 'url';

import { version } from '../../package.json';
import { DatadogCoreProvider, fetchRulesConfiguration } from '../rules-based';
import type {
    FlagSelection,
    RulesConfigurationFetchOptions
} from '../rules-based';

import { matchingContext, rulesWire } from './__utils__/coreConfiguration';
import selectionVectors from './__utils__/flag-selection/selection-vectors.json';

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
const baseUrl =
    'https://ufc-client.ff-cdn.datadoghq.com/api/v2/feature-flagging/config/rules-based/client?dd_env=';

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

    describe('flag selection', () => {
        const logger = { error: jest.fn() };

        beforeEach(() => {
            logger.error.mockReset();
            jest.spyOn(globalThis, 'URL').mockImplementation(() => {
                throw new Error('URL is unavailable');
            });
            jest.spyOn(globalThis, 'URLSearchParams').mockImplementation(() => {
                throw new Error('URLSearchParams is unavailable');
            });
        });

        const sdkCases = selectionVectors.cases.filter(vector => vector.sdk);

        it('includes all pinned SDK vectors', () => {
            expect(sdkCases).toHaveLength(38);
        });

        it.each(sdkCases)(
            'matches the shared SDK vector: $name',
            async vector => {
                const fetch = jest.fn().mockResolvedValue(response());
                const configuration = await fetchRulesConfiguration({
                    ...options,
                    flagSelection: {
                        tags: vector.query?.selected_flag_tags,
                        keyPatterns: vector.query?.selected_flag_key_patterns
                    },
                    fetch,
                    logger
                });
                expect(fetch).toHaveBeenCalledTimes(1);
                const url = new NodeURL(fetch.mock.calls[0][0]);
                const expected: [string, string][] = [['dd_env', options.env]];
                if (vector.sdk?.dropped) {
                    expect(logger.error).toHaveBeenCalledTimes(1);
                    expect(logger.error).toHaveBeenCalledWith(
                        expect.stringContaining(
                            `flagSelection was not sent (${vector.sdk.dropped}: `
                        )
                    );
                } else {
                    expected.push(
                        ...(vector.sdk?.selection?.tags ?? []).map(
                            tag =>
                                ['selected_flag_tags', tag] as [string, string]
                        ),
                        ...(vector.sdk?.selection?.keyPatterns ?? []).map(
                            pattern =>
                                ['selected_flag_key_patterns', pattern] as [
                                    string,
                                    string
                                ]
                        )
                    );
                    expect(logger.error).not.toHaveBeenCalled();
                }
                expect(Array.from(url.searchParams.entries())).toEqual(
                    expected
                );
                expect(fetch.mock.calls[0][1].headers['dd-client-token']).toBe(
                    options.clientToken
                );
                expect(url.toString()).not.toContain(options.clientToken);
                expect(configuration.rules?.response).toBeDefined();
            }
        );

        it('RFC 3986 encodes selection values without mutating the input', async () => {
            const flagSelection: FlagSelection = Object.freeze({
                tags: Object.freeze([" team:checkout &a=1/+%!'() ", 'mobile']),
                keyPatterns: Object.freeze(['checkout-*', 'checkout-*'])
            });
            const fetch = jest.fn().mockResolvedValue(response());
            await fetchRulesConfiguration({
                ...options,
                flagSelection,
                fetch,
                logger
            });
            expect(fetch.mock.calls[0][0]).toBe(
                `${baseUrl}production&selected_flag_tags=mobile&selected_flag_tags=team%3Acheckout%20%26a%3D1%2F%2B%25%21%27%28%29&selected_flag_key_patterns=checkout-%2A`
            );
            expect(logger.error).not.toHaveBeenCalled();
        });

        it.each([
            undefined,
            null,
            {},
            { tags: [], keyPatterns: [] },
            { tags: [' ', '\u0085'] }
        ])('omits empty selection quietly: %j', async flagSelection => {
            const fetch = jest.fn().mockResolvedValue(response());
            await fetchRulesConfiguration({
                ...options,
                flagSelection: flagSelection as FlagSelection,
                fetch,
                logger
            });
            expect(fetch).toHaveBeenCalledTimes(1);
            expect(fetch.mock.calls[0][0]).toBe(`${baseUrl}production`);
            expect(logger.error).not.toHaveBeenCalled();
        });

        it.each([
            true,
            'checkout',
            [],
            { tags: 'checkout' },
            { keyPatterns: [1] },
            { tags: ['\ud800'], keyPatterns: ['valid-*'] },
            { tags: new Array(1) }
        ])(
            'drops the entire malformed selection with a diagnostic: %j',
            async flagSelection => {
                const fetch = jest.fn().mockResolvedValue(response());
                await fetchRulesConfiguration({
                    ...options,
                    flagSelection: flagSelection as FlagSelection,
                    fetch,
                    logger
                });
                expect(fetch).toHaveBeenCalledTimes(1);
                expect(fetch.mock.calls[0][0]).toBe(`${baseUrl}production`);
                expect(logger.error).toHaveBeenCalledTimes(1);
                expect(logger.error).toHaveBeenCalledWith(
                    expect.stringContaining(
                        'flagSelection was not sent (malformed_selection: '
                    )
                );
            }
        );

        it.each(['getter', 'proxy', 'unstable item'])(
            'safely drops a throwing %s without exposing input data',
            async kind => {
                let flagSelection: FlagSelection;
                if (kind === 'getter') {
                    flagSelection = {
                        get tags(): string[] {
                            throw new Error(options.clientToken);
                        }
                    };
                } else if (kind === 'proxy') {
                    const { proxy, revoke } = Proxy.revocable({}, {});
                    revoke();
                    flagSelection = proxy;
                } else {
                    let reads = 0;
                    const tags = ['valid'];
                    Object.defineProperty(tags, 0, {
                        get: () => (++reads === 1 ? 'valid' : '\ud800')
                    });
                    flagSelection = { tags };
                }
                const fetch = jest.fn().mockResolvedValue(response());
                await fetchRulesConfiguration({
                    ...options,
                    flagSelection,
                    fetch,
                    logger
                });
                expect(fetch).toHaveBeenCalledTimes(1);
                expect(fetch.mock.calls[0][0]).toBe(`${baseUrl}production`);
                expect(logger.error).toHaveBeenCalledTimes(1);
                expect(logger.error).toHaveBeenCalledWith(
                    expect.stringContaining('(malformed_selection: ')
                );
                expect(logger.error.mock.calls[0][0]).not.toContain(
                    options.clientToken
                );
            }
        );

        it.each([8192, 8193])(
            'enforces the encoded URL limit at %i bytes',
            async length => {
                const suffix =
                    '&selected_flag_tags=mobile&selected_flag_key_patterns=checkout-%2A';
                const env = 'e'.repeat(length - baseUrl.length - suffix.length);
                const fetch = jest.fn().mockResolvedValue(response());
                await fetchRulesConfiguration({
                    ...options,
                    env,
                    flagSelection: {
                        tags: ['mobile'],
                        keyPatterns: ['checkout-*']
                    },
                    fetch,
                    logger
                });
                expect(fetch).toHaveBeenCalledTimes(1);
                if (length === 8192) {
                    expect(fetch.mock.calls[0][0]).toBe(
                        `${baseUrl}${env}${suffix}`
                    );
                    expect(logger.error).not.toHaveBeenCalled();
                } else {
                    expect(fetch.mock.calls[0][0]).toBe(`${baseUrl}${env}`);
                    expect(logger.error).toHaveBeenCalledTimes(1);
                    expect(logger.error).toHaveBeenCalledWith(
                        expect.stringContaining(
                            'the request URL is at most 8192 bytes'
                        )
                    );
                }
            }
        );

        it.each(['too_many_values', 'future_reason', '', null])(
            'handles an ignored-selection header: %s',
            async reason => {
                const headers = new Headers();
                if (reason !== null) {
                    headers.set('DD-Flag-Selection-Ignored', reason);
                }
                const fetch = jest
                    .fn()
                    .mockResolvedValue(response({ headers }));
                const configuration = await fetchRulesConfiguration({
                    ...options,
                    flagSelection: { tags: ['not-in-fixture'] },
                    fetch,
                    logger
                });
                const provider = new DatadogCoreProvider();
                provider.setConfiguration(configuration);
                await OpenFeature.setProviderAndWait(
                    'selection-ignored',
                    provider,
                    matchingContext
                );
                expect(
                    OpenFeature.getClient('selection-ignored').getBooleanValue(
                        'test-flag',
                        false
                    )
                ).toBe(true);
                expect(fetch).toHaveBeenCalledTimes(1);
                if (reason) {
                    expect(logger.error).toHaveBeenCalledTimes(1);
                    expect(logger.error).toHaveBeenCalledWith(
                        `flagSelection was ignored by the server (${reason}). Loaded the full flag configuration.`
                    );
                } else {
                    expect(logger.error).not.toHaveBeenCalled();
                }
            }
        );

        it('does not report server-ignored selection when no selection was sent', async () => {
            const fetch = jest.fn().mockResolvedValue(
                response({
                    headers: new Headers({
                        'DD-Flag-Selection-Ignored': 'future_reason'
                    })
                })
            );
            await fetchRulesConfiguration({ ...options, fetch, logger });
            expect(logger.error).not.toHaveBeenCalled();
            await fetchRulesConfiguration({
                ...options,
                flagSelection: ({
                    tags: 'invalid'
                } as unknown) as FlagSelection,
                fetch,
                logger
            });
            expect(logger.error).toHaveBeenCalledTimes(1);
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('flagSelection was not sent')
            );
        });

        it('uses console diagnostics by default', async () => {
            const error = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {});
            const fetch = jest.fn().mockResolvedValue(response());
            await fetchRulesConfiguration({
                ...options,
                flagSelection: ({
                    tags: 'invalid'
                } as unknown) as FlagSelection,
                fetch
            });
            expect(error).toHaveBeenCalledTimes(1);
        });

        it('loads a server-ignored response even when the logger throws', async () => {
            logger.error.mockImplementation(() => {
                throw new Error('logger failed');
            });
            const fetch = jest.fn().mockResolvedValue(
                response({
                    headers: new Headers({
                        'DD-Flag-Selection-Ignored': 'future_reason'
                    })
                })
            );
            await expect(
                fetchRulesConfiguration({
                    ...options,
                    flagSelection: { tags: ['mobile'] },
                    fetch,
                    logger
                })
            ).resolves.toHaveProperty('rules');
            expect(fetch).toHaveBeenCalledTimes(1);
            expect(logger.error).toHaveBeenCalledTimes(1);
        });

        it('does not report a full configuration load for a failed HTTP response', async () => {
            const fetch = jest.fn().mockResolvedValue(
                response({
                    ok: false,
                    status: 503,
                    statusText: 'Unavailable',
                    headers: new Headers({
                        'DD-Flag-Selection-Ignored': 'future_reason'
                    })
                })
            );
            await expect(
                fetchRulesConfiguration({
                    ...options,
                    flagSelection: { tags: ['mobile'] },
                    fetch,
                    logger
                })
            ).rejects.toThrow(
                'Failed to fetch flag configuration: Unavailable'
            );
            expect(fetch).toHaveBeenCalledTimes(1);
            expect(logger.error).not.toHaveBeenCalled();
        });

        it('does not let a throwing logger interrupt fallback or replace an HTTP failure', async () => {
            logger.error.mockImplementation(() => {
                throw new Error('logger failed');
            });
            const fetch = jest
                .fn()
                .mockResolvedValueOnce(response())
                .mockResolvedValueOnce(
                    response({
                        ok: false,
                        status: 503,
                        statusText: 'Unavailable'
                    })
                );
            const fetchOptions = {
                ...options,
                flagSelection: ({
                    tags: 'invalid'
                } as unknown) as FlagSelection,
                fetch,
                logger
            };
            await expect(
                fetchRulesConfiguration(fetchOptions)
            ).resolves.toHaveProperty('rules');
            await expect(fetchRulesConfiguration(fetchOptions)).rejects.toThrow(
                'Failed to fetch flag configuration: Unavailable'
            );
            expect(fetch).toHaveBeenCalledTimes(2);
        });
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
