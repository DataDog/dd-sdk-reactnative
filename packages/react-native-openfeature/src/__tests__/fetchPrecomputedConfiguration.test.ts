/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    configurationFromString,
    configurationToString,
    getPrecomputedContext
} from '@datadog/flagging-core';
import { ErrorCode } from '@openfeature/web-sdk';
import type { EvaluationContext } from '@openfeature/web-sdk';
import { createHash } from 'crypto';

import { fetchPrecomputedConfiguration } from '../fetchPrecomputedConfiguration';
import type { PrecomputedConfigurationFetchOptions } from '../fetchPrecomputedConfiguration';
import type { FlagSelection } from '../index';
import { version } from '../version';

import selectionVectors from './__utils__/flag-selection/selection-vectors.json';

jest.mock('@datadog/mobile-react-native', () => {
    throw new Error('Fetching must not load the native SDK');
});
jest.mock('@bufbuild/protobuf', () => {
    throw new Error('Precomputed fetching must not load protobuf');
});

const options: PrecomputedConfigurationFetchOptions = {
    clientToken: 'test-client-token',
    env: 'production',
    context: { targetingKey: 'user-1', country: 'US' }
};
const url =
    'https://preview.ff-cdn.datadoghq.com/precompute-assignments?dd_env=production';
const logger = { error: jest.fn() };

function payload() {
    return {
        data: {
            attributes: {
                createdAt: '2026-01-01T00:00:00Z',
                flags: {
                    'checkout-enabled': {
                        allocationKey: 'allocation',
                        variationKey: 'on',
                        variationType: 'boolean',
                        variationValue: true,
                        reason: 'TARGETING_MATCH',
                        doLog: true,
                        serialId: 42
                    }
                }
            }
        }
    };
}

function response(
    body: unknown = payload(),
    overrides: Partial<Response> = {}
): Response {
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/vnd.api+json' }),
        json: jest.fn(async () => JSON.parse(JSON.stringify(body))),
        clone: () => response(body, overrides),
        ...overrides
    } as Response;
}

function request(fetch: jest.Mock) {
    return JSON.parse(fetch.mock.calls[0][1].body).data.attributes;
}

describe('fetchPrecomputedConfiguration', () => {
    beforeEach(() => {
        logger.error.mockReset();
    });
    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it('posts the browser-compatible JSON API contract with RN identity and decoder capabilities', async () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-11-18T12:00:00Z'));
        const fetch = jest.fn().mockResolvedValue(response());
        const configuration = await fetchPrecomputedConfiguration({
            ...options,
            fetch,
            applicationId: 'test-application'
        });
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/vnd.api+json',
                'dd-client-token': options.clientToken,
                'dd-application-id': 'test-application',
                'X-DD-FEATURE-FLAGS-CAPABILITIES':
                    'assignment-encoding-flag-key-256-v1'
            },
            body: JSON.stringify({
                data: {
                    type: 'precompute-assignments-request',
                    attributes: {
                        env: { dd_env: 'production' },
                        source: {
                            sdk_name: 'react-native',
                            sdk_version: version
                        },
                        subject: {
                            targeting_key: 'user-1',
                            targeting_attributes: {
                                targetingKey: 'user-1',
                                country: 'US'
                            }
                        }
                    }
                }
            }),
            signal: undefined
        });
        expect(configuration.precomputed).toMatchObject({
            response: payload(),
            context: options.context,
            fetchedAt: Date.now()
        });
        expect(configuration.rules).toBeUndefined();
        expect(jest.getTimerCount()).toBe(0);
    });

    it('omits the application ID header when no application ID is supplied', async () => {
        const fetch = jest.fn().mockResolvedValue(response());
        await fetchPrecomputedConfiguration({ ...options, fetch });
        expect(fetch.mock.calls[0][1].headers).not.toHaveProperty(
            'dd-application-id'
        );
    });

    it('reports default diagnostics as prefixed warnings rather than console errors', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const error = jest.spyOn(console, 'error').mockImplementation(() => {});
        const fetch = jest.fn().mockResolvedValue(response());
        await expect(
            fetchPrecomputedConfiguration({
                ...options,
                fetch,
                context: {
                    ...options.context,
                    dd_assignment_token: 'two words'
                },
                flagSelection: ({ tags: 'invalid' } as unknown) as FlagSelection
            })
        ).resolves.toHaveProperty('precomputed');
        expect(warn).toHaveBeenCalledTimes(2);
        for (const [message] of warn.mock.calls) {
            expect(message).toMatch(/^DATADOG: /);
            expect(message).not.toContain('two words');
        }
        expect(error).not.toHaveBeenCalled();
    });

    it('captures context before the request and round-trips it without retaining caller references', async () => {
        const context = {
            targetingKey: 'user-1',
            nested: { values: ['before'] }
        };
        const fetch = jest.fn().mockImplementation(async () => {
            context.targetingKey = 'user-2';
            context.nested.values.push('after');
            return response();
        });
        const configuration = await fetchPrecomputedConfiguration({
            ...options,
            context,
            fetch
        });
        const captured = {
            targetingKey: 'user-1',
            nested: { values: ['before'] }
        };
        expect(configuration.precomputed?.context).toEqual(captured);
        expect(request(fetch).subject.targeting_attributes).toEqual({
            targetingKey: 'user-1',
            nested: '{"values":["before"]}'
        });
        const restored = configurationFromString(
            configurationToString(configuration)
        );
        expect(getPrecomputedContext(restored)).toEqual(captured);
        expect(restored.precomputed?.response).toEqual(payload());
    });

    it('uses JSON representations for nonstring attributes and omits undefined values', async () => {
        const context = {
            targetingKey: 'user-1',
            enabled: true,
            count: 3,
            empty: null,
            list: [1, 'two'],
            nested: { key: false },
            omitted: undefined,
            callback: () => true,
            symbol: Symbol('omitted'),
            date: new Date('2026-01-01T00:00:00Z')
        };
        const fetch = jest.fn().mockResolvedValue(response());
        const configuration = await fetchPrecomputedConfiguration({
            ...options,
            context: (context as unknown) as EvaluationContext,
            fetch
        });
        expect(request(fetch).subject.targeting_attributes).toEqual({
            targetingKey: 'user-1',
            enabled: 'true',
            count: '3',
            empty: 'null',
            list: '[1,"two"]',
            nested: '{"key":false}',
            date: '"2026-01-01T00:00:00.000Z"'
        });
        expect(configuration.precomputed?.context).toEqual({
            targetingKey: 'user-1',
            enabled: true,
            count: 3,
            empty: null,
            list: [1, 'two'],
            nested: { key: false },
            date: '2026-01-01T00:00:00.000Z'
        });
    });

    it.each([{}, { targetingKey: '' }, { targetingKey: undefined }])(
        'supports anonymous context %j',
        async context => {
            const fetch = jest.fn().mockResolvedValue(response());
            await fetchPrecomputedConfiguration({ ...options, context, fetch });
            expect(request(fetch).subject.targeting_key).toBe('');
        }
    );

    it.each([null, [], 'user', { targetingKey: 1 }, { value: BigInt(1) }])(
        'rejects invalid or nonserializable context before fetching: %p',
        async context => {
            const fetch = jest.fn();
            await expect(
                fetchPrecomputedConfiguration({
                    ...options,
                    context: context as EvaluationContext,
                    fetch
                })
            ).rejects.toMatchObject({ code: ErrorCode.INVALID_CONTEXT });
            expect(fetch).not.toHaveBeenCalled();
        }
    );

    it('rejects cyclic context without leaking accessor errors', async () => {
        const context: EvaluationContext = {};
        context.self = context;
        const fetch = jest.fn();
        await expect(
            fetchPrecomputedConfiguration({ ...options, context, fetch })
        ).rejects.toMatchObject({ code: ErrorCode.INVALID_CONTEXT });
        await expect(
            fetchPrecomputedConfiguration({
                ...options,
                context: {
                    get targetingKey(): string {
                        throw new Error('private context');
                    }
                },
                fetch
            })
        ).rejects.toThrow(
            'Precomputed context must be a JSON-serializable object'
        );
        expect(fetch).not.toHaveBeenCalled();
    });

    it('preserves reserved attribute names as data without prototype mutation', async () => {
        const context = JSON.parse(
            '{"targetingKey":"user-1","__proto__":{"safe":true}}'
        );
        const fetch = jest.fn().mockResolvedValue(response());
        const configuration = await fetchPrecomputedConfiguration({
            ...options,
            context,
            fetch
        });
        expect(
            Object.getOwnPropertyDescriptor(
                configuration.precomputed?.context ?? {},
                '__proto__'
            )?.value
        ).toEqual({ safe: true });
        expect(
            Object.getOwnPropertyDescriptor(
                request(fetch).subject.targeting_attributes,
                '__proto__'
            )?.value
        ).toBe('{"safe":true}');
        expect({}).not.toHaveProperty('safe');
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
    ])('uses the supported %s site without requiring URL APIs', async site => {
        jest.spyOn(globalThis, 'URL').mockImplementation(() => {
            throw new Error('unavailable');
        });
        jest.spyOn(globalThis, 'URLSearchParams').mockImplementation(() => {
            throw new Error('unavailable');
        });
        const fetch = jest.fn().mockResolvedValue(response());
        await fetchPrecomputedConfiguration({
            ...options,
            site,
            env: 'staging & preview',
            fetch
        });
        expect(fetch.mock.calls[0][0]).toBe(
            `https://preview.ff-cdn.${site}/precompute-assignments?dd_env=staging%20%26%20preview`
        );
        expect(request(fetch).env.dd_env).toBe('staging & preview');
    });

    it.each([
        'ddog-gov.com',
        'https://datadoghq.com',
        'datadoghq.com.evil.test',
        'localhost'
    ])('rejects unsupported site %s before sending credentials', async site => {
        const fetch = jest.fn();
        await expect(
            fetchPrecomputedConfiguration({ ...options, site, fetch })
        ).rejects.toThrow(/Unsupported site|not supported/);
        expect(fetch).not.toHaveBeenCalled();
    });

    it.each([undefined, null])(
        'uses the default site when site is %p',
        async site => {
            const fetch = jest.fn().mockResolvedValue(response());
            await fetchPrecomputedConfiguration({
                ...options,
                fetch,
                site: (site as unknown) as string
            });
            expect(fetch.mock.calls[0][0]).toBe(url);
        }
    );

    it('uses global fetch by default and accepts an injected fetch and abort signal', async () => {
        const globalFetch = jest
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(response());
        await fetchPrecomputedConfiguration(options);
        expect(globalFetch).toHaveBeenCalledTimes(1);
        const fetch = jest.fn().mockResolvedValue(response());
        const controller = new AbortController();
        await fetchPrecomputedConfiguration({
            ...options,
            fetch,
            signal: controller.signal
        });
        expect(fetch.mock.calls[0][1].signal).toBe(controller.signal);
        expect(globalFetch).toHaveBeenCalledTimes(1);
    });

    it('retains encoded-key responses with their encoding metadata', async () => {
        const body = payload();
        const salt = '00112233445566778899aabbccddeeff';
        const hash = createHash('sha256')
            .update('datadog.feature-flags.flag-key.v1\0')
            .update(Buffer.from(salt, 'hex'))
            .update('checkout-enabled')
            .digest('hex');
        const attributes = body.data.attributes;
        const fetch = jest.fn().mockResolvedValue(
            response({
                data: {
                    attributes: {
                        ...attributes,
                        obfuscated: true,
                        obfuscation: { scheme: 'flag-key-sha256-v1', salt },
                        flags: { [hash]: attributes.flags['checkout-enabled'] }
                    }
                }
            })
        );
        const configuration = await fetchPrecomputedConfiguration({
            ...options,
            fetch
        });
        const wire = configurationToString(configuration);
        expect(JSON.parse(wire).version).toBe(2);
        expect(configurationFromString(wire)).toEqual(configuration);
        expect(
            configuration.precomputed?.response.data.attributes.flags[hash]
                .variationValue
        ).toBe(true);
    });

    it.each([null, {}, { data: {} }])(
        'returns a structured parser error for an invalid response: %j',
        async body => {
            const fetch = jest.fn().mockResolvedValue(response(body));
            const configuration = await fetchPrecomputedConfiguration({
                ...options,
                fetch
            });
            expect(configuration.precomputed).toBeUndefined();
            expect(configuration.precomputedError).toEqual(expect.any(String));
        }
    );

    it('isolates an invalid flag and retains valid flags', async () => {
        const body = payload();
        Object.assign(body.data.attributes.flags, {
            broken: { variationType: 'unknown' }
        });
        const fetch = jest.fn().mockResolvedValue(response(body));
        const configuration = await fetchPrecomputedConfiguration({
            ...options,
            fetch
        });
        expect(configuration.precomputed?.flagErrors?.broken).toEqual(
            expect.any(String)
        );
        expect(
            configuration.precomputed?.response.data.attributes.flags[
                'checkout-enabled'
            ].serialId
        ).toBe(42);
    });

    it('rejects a response that applied a different experimentation policy', async () => {
        const body = payload();
        Object.assign(body.data.attributes, {
            evaluation_options: {
                experimentation_opt_out: true,
                experimentation_opt_out_mode: 'immediate'
            }
        });
        const fetch = jest.fn().mockResolvedValue(response(body));
        await expect(
            fetchPrecomputedConfiguration({ ...options, fetch })
        ).rejects.toMatchObject({ code: ErrorCode.PARSE_ERROR });
    });

    describe('flag selection', () => {
        it.each(selectionVectors.cases.filter(vector => vector.sdk))(
            'posts the canonical SDK selection: $name',
            async vector => {
                const fetch = jest.fn().mockResolvedValue(response());
                await fetchPrecomputedConfiguration({
                    ...options,
                    fetch,
                    logger,
                    flagSelection: {
                        tags: vector.query?.selected_flag_tags,
                        keyPatterns: vector.query?.selected_flag_key_patterns
                    }
                });
                const expected = vector.sdk?.selection;
                expect(request(fetch).flag_selection).toEqual(
                    expected &&
                        (expected.tags.length > 0 ||
                            expected.keyPatterns.length > 0)
                        ? {
                              tags: expected.tags,
                              key_patterns: expected.keyPatterns
                          }
                        : undefined
                );
                expect(logger.error).toHaveBeenCalledTimes(
                    vector.sdk?.dropped ? 1 : 0
                );
                expect(fetch.mock.calls[0][0]).toBe(url);
            }
        );

        it('does not apply the rules URL-size limit to a valid POST selection', async () => {
            const fetch = jest.fn().mockResolvedValue(response());
            const flagSelection = {
                tags: Array.from(
                    { length: 31 },
                    (_, i) => `tag-${i}-${'x'.repeat(190)}`
                ),
                keyPatterns: Array.from(
                    { length: 31 },
                    (_, i) => `flag-${i}-${'y'.repeat(190)}*`
                )
            };
            await fetchPrecomputedConfiguration({
                ...options,
                fetch,
                logger,
                flagSelection
            });
            expect(fetch.mock.calls[0][1].body.length).toBeGreaterThan(8192);
            expect(request(fetch).flag_selection.tags).toHaveLength(31);
            expect(request(fetch).flag_selection.key_patterns).toHaveLength(31);
            expect(logger.error).not.toHaveBeenCalled();
        });

        it.each(['getter', 'unstable item'])(
            'drops a throwing or malformed %s with one bounded diagnostic',
            async kind => {
                const fetch = jest.fn().mockResolvedValue(response());
                let reads = 0;
                const tags = ['valid'];
                Object.defineProperty(tags, 0, {
                    get: () => (++reads === 1 ? 'valid' : '\ud800')
                });
                await fetchPrecomputedConfiguration({
                    ...options,
                    fetch,
                    logger,
                    flagSelection: {
                        get tags(): string[] {
                            if (kind === 'getter') {
                                throw new Error('private selection');
                            }
                            return tags;
                        }
                    }
                });
                expect(request(fetch).flag_selection).toBeUndefined();
                expect(logger.error).toHaveBeenCalledTimes(1);
                expect(logger.error.mock.calls[0][0]).not.toContain(
                    'private selection'
                );
            }
        );

        it.each(['invalid_tag', 'private response header'])(
            'reports ignored selection after decoding, sanitizing %s',
            async reason => {
                const headers = new Headers({
                    'DD-Flag-Selection-Ignored': reason
                });
                const fetch = jest.fn().mockResolvedValue(
                    response(payload(), {
                        headers,
                        json: jest.fn(async () => {
                            expect(logger.error).not.toHaveBeenCalled();
                            return payload();
                        })
                    })
                );
                const configuration = await fetchPrecomputedConfiguration({
                    ...options,
                    fetch,
                    logger,
                    flagSelection: { tags: ['not-selected'] }
                });
                expect(
                    configuration.precomputed?.response.data.attributes.flags[
                        'checkout-enabled'
                    ]
                ).toBeDefined();
                expect(logger.error).toHaveBeenCalledWith(
                    `flagSelection was ignored by the server (${
                        reason === 'invalid_tag' ? reason : 'unknown'
                    }). Loaded the full flag configuration.`
                );
            }
        );

        it('does not report ignored selection for an unusable response or unsent selection', async () => {
            const headers = new Headers({
                'DD-Flag-Selection-Ignored': 'invalid_tag'
            });
            const fetch = jest
                .fn()
                .mockResolvedValueOnce(response({}, { headers }))
                .mockResolvedValueOnce(response(payload(), { headers }));
            await fetchPrecomputedConfiguration({
                ...options,
                fetch,
                logger,
                flagSelection: { tags: ['mobile'] }
            });
            await fetchPrecomputedConfiguration({ ...options, fetch, logger });
            expect(logger.error).not.toHaveBeenCalled();
        });

        it('does not let a diagnostic failure prevent fetching', async () => {
            logger.error.mockImplementation(() => {
                throw new Error('logger failed');
            });
            const fetch = jest.fn().mockResolvedValue(response());
            await expect(
                fetchPrecomputedConfiguration({
                    ...options,
                    fetch,
                    logger,
                    flagSelection: ({
                        tags: 'invalid'
                    } as unknown) as FlagSelection
                })
            ).resolves.toHaveProperty('precomputed');
        });
    });

    describe('assignment authorization', () => {
        const token = 'synthetic.assignment.credential';

        it('sends the opaque credential only in its reserved header, never in the context or wire', async () => {
            const context = { ...options.context, dd_assignment_token: token };
            const fetch = jest.fn().mockResolvedValue(response());
            const configuration = await fetchPrecomputedConfiguration({
                ...options,
                context,
                fetch
            });
            expect(fetch.mock.calls[0][1].headers['DD-Assignment-Token']).toBe(
                token
            );
            expect(fetch.mock.calls[0][1].body).not.toContain(token);
            expect(configuration.precomputed?.context).toEqual(options.context);
            expect(configurationToString(configuration)).not.toContain(token);
            expect(context.dd_assignment_token).toBe(token);
        });

        it.each([
            null,
            undefined,
            '',
            42,
            'two words',
            'line\r\nbreak',
            '\u00e9'
        ])(
            'omits unusable assignment credential %p without exposing its value',
            async dd_assignment_token => {
                const fetch = jest.fn().mockResolvedValue(response());
                await fetchPrecomputedConfiguration({
                    ...options,
                    fetch,
                    logger,
                    context: { ...options.context, dd_assignment_token }
                });
                expect(fetch.mock.calls[0][1].headers).not.toHaveProperty(
                    'DD-Assignment-Token'
                );
                expect(
                    request(fetch).subject.targeting_attributes
                ).not.toHaveProperty('dd_assignment_token');
                expect(logger.error).toHaveBeenCalledTimes(
                    dd_assignment_token == null || dd_assignment_token === ''
                        ? 0
                        : 1
                );
                if (logger.error.mock.calls.length > 0) {
                    expect(logger.error.mock.calls[0][0]).toBe(
                        'Assignment token omitted: expected printable ASCII without whitespace. Continuing without an assignment token.'
                    );
                    expect(logger.error.mock.calls[0][0]).not.toContain(
                        String(dd_assignment_token)
                    );
                }
            }
        );

        it.each([false, true])(
            'identifies assignment authorization failures with credential=%s without exposing the response detail',
            async hasToken => {
                const fetch = jest.fn().mockResolvedValue(
                    response(
                        {
                            errors: [
                                {
                                    code: 'ASSIGNMENT_AUTHORIZATION_FAILED',
                                    detail: token
                                }
                            ]
                        },
                        { ok: false, status: 401 }
                    )
                );
                await expect(
                    fetchPrecomputedConfiguration({
                        ...options,
                        fetch,
                        context: {
                            ...options.context,
                            ...(hasToken && { dd_assignment_token: token })
                        }
                    })
                ).rejects.toMatchObject({
                    code: ErrorCode.GENERAL,
                    message: 'ASSIGNMENT_AUTHORIZATION_FAILED'
                });
            }
        );

        it.each([200, 403])(
            'does not interpret an authorization code in an HTTP %i response',
            async status => {
                const received = response(
                    {
                        ...payload(),
                        errors: [
                            {
                                code: 'ASSIGNMENT_AUTHORIZATION_FAILED',
                                detail: 'Ordinary HTTP failure'
                            }
                        ]
                    },
                    { ok: status === 200, status }
                );
                const clone = jest.spyOn(received, 'clone');
                const fetch = jest.fn().mockResolvedValue(received);
                const result = fetchPrecomputedConfiguration({
                    ...options,
                    fetch
                });
                if (status === 200) {
                    await expect(result).resolves.toHaveProperty('precomputed');
                } else {
                    await expect(result).rejects.toThrow(
                        'Failed to fetch flag configuration: Ordinary HTTP failure'
                    );
                }
                expect(clone).not.toHaveBeenCalled();
            }
        );

        it('reads a cloned 401 body without consuming the ordinary HTTP error detail', async () => {
            const received = new Response(
                JSON.stringify({
                    errors: [{ code: 'OTHER', detail: 'Client token rejected' }]
                }),
                {
                    status: 401,
                    statusText: 'Unauthorized',
                    headers: { 'content-type': 'application/vnd.api+json' }
                }
            );
            const clone = jest.spyOn(received, 'clone');
            const fetch = jest.fn().mockResolvedValue(received);
            await expect(
                fetchPrecomputedConfiguration({ ...options, fetch })
            ).rejects.toThrow(
                'Failed to fetch flag configuration: Client token rejected'
            );
            expect(clone).toHaveBeenCalledTimes(1);
            expect(received.bodyUsed).toBe(true);
        });

        it.each([
            ['AbortError', false],
            ['AbortError', true],
            ['TimeoutError', false],
            ['TimeoutError', true]
        ] as const)(
            'preserves %s from the cloned 401 body with credential=%s',
            async (name, hasToken) => {
                const error = Object.assign(new Error(token), {
                    name,
                    cause: { token },
                    privateMetadata: token
                });
                const received = response(
                    {},
                    {
                        ok: false,
                        status: 401,
                        statusText: 'Unauthorized',
                        clone: jest.fn(() =>
                            response(
                                {},
                                {
                                    json: jest.fn().mockRejectedValue(error)
                                }
                            )
                        )
                    }
                );
                const fetch = jest.fn().mockResolvedValue(received);
                const failure = await fetchPrecomputedConfiguration({
                    ...options,
                    fetch,
                    context: {
                        ...options.context,
                        ...(hasToken && { dd_assignment_token: token })
                    }
                }).catch(caught => caught);

                expect(failure).toMatchObject({ name });
                if (hasToken) {
                    expect(failure).not.toBe(error);
                    expect(failure.message).toBe(
                        name === 'AbortError'
                            ? 'Assignment download aborted'
                            : 'Assignment download timed out'
                    );
                    expect(failure.stack).not.toContain(token);
                    expect(failure.cause).toBeUndefined();
                    expect(failure.privateMetadata).toBeUndefined();
                } else {
                    expect(failure).toBe(error);
                }
                expect(received.clone).toHaveBeenCalledTimes(1);
                expect(received.json).not.toHaveBeenCalled();
                expect(fetch).toHaveBeenCalledTimes(1);
            }
        );

        it('keeps an unreadable cloned 401 body as a credential-safe HTTP failure', async () => {
            const fetch = jest.fn().mockResolvedValue(
                response(
                    {},
                    {
                        ok: false,
                        status: 401,
                        clone: () =>
                            response(
                                {},
                                {
                                    json: jest
                                        .fn()
                                        .mockRejectedValue(
                                            new SyntaxError(token)
                                        )
                                }
                            )
                    }
                )
            );
            const failure = await fetchPrecomputedConfiguration({
                ...options,
                fetch,
                context: { ...options.context, dd_assignment_token: token }
            }).catch(caught => caught);
            expect(failure).toMatchObject({
                name: 'Error',
                message: 'Failed to fetch flag configuration: HTTP 401'
            });
            expect(failure.stack).not.toContain(token);
            expect(failure.cause).toBeUndefined();
        });

        it.each(['transport', 'body', 'http'])(
            'does not leak credentials through a %s failure',
            async stage => {
                const error = Object.assign(new Error(token), {
                    cause: { token }
                });
                const fetch =
                    stage === 'transport'
                        ? jest.fn().mockRejectedValue(error)
                        : jest.fn().mockResolvedValue(
                              stage === 'body'
                                  ? response(payload(), {
                                        json: jest.fn().mockRejectedValue(error)
                                    })
                                  : response(
                                        { errors: [{ detail: token }] },
                                        {
                                            ok: false,
                                            status: 500,
                                            statusText: token
                                        }
                                    )
                          );
                const failure = await fetchPrecomputedConfiguration({
                    ...options,
                    fetch,
                    context: { ...options.context, dd_assignment_token: token }
                }).catch(caught => caught);
                expect(failure).toBeInstanceOf(Error);
                expect(failure.message).not.toContain(token);
                expect(failure.stack).not.toContain(token);
                expect(failure.cause).toBeUndefined();
                if (stage === 'body') {
                    expect(failure.code).toBe(ErrorCode.PARSE_ERROR);
                }
                expect(fetch).toHaveBeenCalledTimes(1);
            }
        );

        it.each(['AbortError', 'TimeoutError'])(
            'preserves %s classification with a fixed message',
            async name => {
                const fetch = jest
                    .fn()
                    .mockRejectedValue(
                        Object.assign(new Error(token), { name })
                    );
                await expect(
                    fetchPrecomputedConfiguration({
                        ...options,
                        fetch,
                        context: {
                            ...options.context,
                            dd_assignment_token: token
                        }
                    })
                ).rejects.toMatchObject({
                    name,
                    message: expect.not.stringContaining(token)
                });
            }
        );
    });

    it('accepts a successful selected response without optional headers', async () => {
        const fetch = jest
            .fn()
            .mockResolvedValue(response(payload(), { headers: undefined }));
        await expect(
            fetchPrecomputedConfiguration({
                ...options,
                fetch,
                logger,
                flagSelection: { tags: ['mobile'] }
            })
        ).resolves.toHaveProperty('precomputed');
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('uses the HTTP status text when an error response has no headers', async () => {
        const fetch = jest.fn().mockResolvedValue(
            response(
                {},
                {
                    ok: false,
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: undefined
                }
            )
        );
        await expect(
            fetchPrecomputedConfiguration({ ...options, fetch })
        ).rejects.toThrow(
            'Failed to fetch flag configuration: Service Unavailable'
        );
    });

    it.each(['AbortError', 'TimeoutError'])(
        'preserves %s while reading an HTTP error body',
        async name => {
            const error = Object.assign(new Error('body interrupted'), {
                name
            });
            const fetch = jest.fn().mockResolvedValue(
                response(
                    {},
                    {
                        ok: false,
                        status: 503,
                        statusText: 'Service Unavailable',
                        json: jest.fn().mockRejectedValue(error)
                    }
                )
            );
            await expect(
                fetchPrecomputedConfiguration({ ...options, fetch })
            ).rejects.toBe(error);
        }
    );

    it.each([400, 401, 403, 429, 503])(
        'rejects HTTP %i without retries or a custom timer',
        async status => {
            jest.useFakeTimers();
            const fetch = jest
                .fn()
                .mockResolvedValue(
                    response(
                        { errors: [{ detail: 'Request failed' }] },
                        { ok: false, status }
                    )
                );
            await expect(
                fetchPrecomputedConfiguration({ ...options, fetch })
            ).rejects.toThrow(
                'Failed to fetch flag configuration: Request failed'
            );
            expect(fetch).toHaveBeenCalledTimes(1);
            expect(jest.getTimerCount()).toBe(0);
        }
    );

    it.each(['network', 'body read', 'cancellation'])(
        'preserves a %s failure when no assignment credential is present',
        async stage => {
            const error =
                stage === 'cancellation'
                    ? Object.assign(new Error('cancelled'), {
                          name: 'AbortError'
                      })
                    : new Error(stage);
            const fetch =
                stage === 'body read'
                    ? jest.fn().mockResolvedValue(
                          response(payload(), {
                              json: jest.fn().mockRejectedValue(error)
                          })
                      )
                    : jest.fn().mockRejectedValue(error);
            await expect(
                fetchPrecomputedConfiguration({ ...options, fetch })
            ).rejects.toBe(error);
            expect(fetch).toHaveBeenCalledTimes(1);
        }
    );
});
