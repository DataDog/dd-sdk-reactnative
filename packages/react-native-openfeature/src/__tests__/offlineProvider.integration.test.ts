/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Integration test: exercises the offline provider against the REAL core FlagsClient (no mock of
// @datadog/mobile-react-native) AND through the REAL OpenFeature Web SDK lifecycle, so the actual
// configuration parse, context reconcile, provider-status transitions, and evaluation-detail
// mapping run. Assertions read the SDK's provider status (the status-overwrite bug is only visible
// end to end), the evaluation error code, and served values. Only the native TurboModule is stubbed
// (it is unavailable under jest) so ready-state evaluation can track exposures without throwing.

import { configurationFromString } from '@datadog/mobile-react-native';
import { ErrorCode, OpenFeature, ProviderStatus } from '@openfeature/web-sdk';
import type { EvaluationContext } from '@openfeature/web-sdk';

import { getPrecomputedContext } from '../configuration';
import { DatadogOfflineOpenFeatureProvider } from '../offlineProvider';

// Stub the native flags TurboModule (TurboModuleRegistry.get returns null under jest), so
// ready-state evaluation can call trackEvaluation without throwing.
jest.mock('../../../core/src/specs/NativeDdFlags', () => ({
    __esModule: true,
    default: {
        enable: jest.fn(() => Promise.resolve()),
        setEvaluationContext: jest.fn(() => Promise.resolve({})),
        trackEvaluation: jest.fn(() => Promise.resolve())
    }
}));

const wireFor = (context?: EvaluationContext): string =>
    JSON.stringify({
        version: 1,
        precomputed: {
            response: JSON.stringify({
                data: {
                    attributes: {
                        obfuscated: false,
                        flags: {
                            'new-feature': {
                                variationType: 'boolean',
                                variationValue: true,
                                variationKey: 'true',
                                allocationKey: 'alloc-1',
                                reason: 'STATIC',
                                doLog: false,
                                extraLogging: {}
                            }
                        }
                    }
                }
            }),
            ...(context === undefined ? {} : { context })
        }
    });

const rulesResponseFor = (flagKey: string) => ({
    createdAt: '2026-07-23T12:00:00.000Z',
    format: 'SERVER',
    environment: { name: 'test' },
    flags: {
        [flagKey]: {
            key: flagKey,
            enabled: true,
            variationType: 'BOOLEAN',
            variations: {
                enabled: { key: 'enabled', value: true }
            },
            allocations: [
                {
                    key: 'rules-allocation',
                    rules: [
                        {
                            conditions: [
                                {
                                    operator: 'ONE_OF',
                                    attribute: 'country',
                                    value: ['US']
                                }
                            ]
                        }
                    ],
                    splits: [
                        {
                            variationKey: 'enabled',
                            serialId: 7,
                            shards: [
                                {
                                    salt: 'test-salt',
                                    ranges: [{ start: 0, end: 100 }],
                                    totalShards: 100
                                }
                            ]
                        }
                    ],
                    doLog: false
                }
            ]
        }
    }
});

// TODO(FFL-2837): Replace this legacy `rulesBased` JSON helper after a published
// flagging-core release contains DataDog/openfeature-js-client#344 through
// `41dff20`, restores 32-byte SHA digest validation, and either supports integer
// and shard evaluation without global `BigInt` or declares `BigInt` as a runtime
// requirement. The `41dff20` smoke test covers only a static boolean without
// `BigInt`. Use canonical raw protobuf bytes produced from the dd-source#34959
// client-distribution path.
// Put one base64 encoding of those bytes in a version 1 `rules.response` envelope,
// verify that decoding returns the original bytes, and record the source revision.
// Use the upstream `@datadog/flagging-core/configuration` parser. Do not copy the
// strict base64 validator removed by PR #344. Reuse the portable-wire fixture for
// examples, Metro, Hermes, and JSC checks. Also confirm that the default flagging-core
// entry point excludes Protobuf-ES and measure whether the React Native root includes it.
// The fixture must prove that unknown fields preserve supported known data and
// that an out-of-range `int64` stays a `bigint` before evaluation returns
// `PARSE_ERROR`. Round-trip it through `configurationToString` and prove that
// unknown fields survive serialization. Run safe and unsafe integer variations,
// shard counts, and shard ranges without global `BigInt`; invalid data must return
// `PARSE_ERROR`, not `GENERAL`. Run the same fixture in the supported Hermes and
// JSC versions.
const rulesWireFor = (
    flagKey: string,
    response = rulesResponseFor(flagKey)
): string =>
    JSON.stringify({
        version: 1,
        rulesBased: {
            response: JSON.stringify(response)
        }
    });

// A unique OpenFeature domain + Datadog clientName per test keeps providers isolated (separate
// domains otherwise share the same underlying FlagsClient).
let seq = 0;
const freshNames = () => {
    seq += 1;
    return { domain: `offline-int-${seq}`, clientName: `offline-int-${seq}` };
};

const requiredPrecomputedContext = (
    configuration: ReturnType<typeof configurationFromString>
): EvaluationContext => {
    const context = getPrecomputedContext(configuration);

    if (context === undefined) {
        throw new Error(
            'Expected a context-specific precomputed configuration.'
        );
    }

    return context;
};

describe('DatadogOfflineOpenFeatureProvider (integration, real FlagsClient + OpenFeature)', () => {
    afterEach(async () => {
        await OpenFeature.clearProviders();
        // Reset the global context so a context set by one test does not leak into the next.
        await OpenFeature.clearContext();
        jest.clearAllMocks();
    });

    it('uses the helper context to start READY with a precomputed configuration', async () => {
        const { domain, clientName } = freshNames();
        const configuration = configurationFromString(
            wireFor({ targetingKey: 'user-123' })
        );
        const context = getPrecomputedContext(configuration);

        expect(context).toEqual({ targetingKey: 'user-123' });
        await OpenFeature.setContext(
            domain,
            requiredPrecomputedContext(configuration)
        );

        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });
        provider.setConfiguration(configuration);

        await OpenFeature.setProviderAndWait(domain, provider);

        const client = OpenFeature.getClient(domain);
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanValue('new-feature', false)).toBe(true);
        expect(
            jest.requireMock('../../../core/src/specs/NativeDdFlags').default
                .setEvaluationContext
        ).not.toHaveBeenCalled();
    });

    it('evaluates rules for each new context without a fetch', async () => {
        const { domain, clientName } = freshNames();
        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });
        provider.setConfiguration(
            configurationFromString(rulesWireFor('dynamic-feature'))
        );
        await OpenFeature.setProviderAndWait(domain, provider);

        const client = OpenFeature.getClient(domain);
        await OpenFeature.setContext(domain, {
            targetingKey: 'user-1',
            country: 'US'
        });
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanValue('dynamic-feature', false)).toBe(true);

        await OpenFeature.setContext(domain, {
            targetingKey: 'user-2',
            country: 'CA'
        });
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanValue('dynamic-feature', false)).toBe(false);

        const nativeFlags = jest.requireMock(
            '../../../core/src/specs/NativeDdFlags'
        ).default;
        expect(nativeFlags.setEvaluationContext).not.toHaveBeenCalled();
    });

    it('does not synthesize an empty targeting key when a shard requires one', async () => {
        const { domain, clientName } = freshNames();
        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });
        provider.setConfiguration(
            configurationFromString(rulesWireFor('dynamic-feature'))
        );
        await OpenFeature.setProviderAndWait(domain, provider);

        await OpenFeature.setContext(domain, { country: 'US' });

        const details = OpenFeature.getClient(domain).getBooleanDetails(
            'dynamic-feature',
            false
        );
        expect(details.value).toBe(false);
        expect(details.errorCode).toBe(ErrorCode.TARGETING_KEY_MISSING);
    });

    it('preserves an unsafe-integer PARSE_ERROR and does not track it', async () => {
        const { domain, clientName } = freshNames();
        const response = rulesResponseFor('invalid-feature');
        const flag = (response.flags['invalid-feature'] as unknown) as {
            variationType: string;
            variations: { enabled: { value: unknown } };
        };
        flag.variationType = 'INTEGER';
        flag.variations.enabled.value = Number.MAX_SAFE_INTEGER + 1;

        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });
        provider.setConfiguration(
            configurationFromString(rulesWireFor('invalid-feature', response))
        );
        await OpenFeature.setProviderAndWait(domain, provider);

        const details = OpenFeature.getClient(domain).getNumberDetails(
            'invalid-feature',
            0
        );
        expect(details).toMatchObject({
            value: 0,
            reason: 'ERROR',
            errorCode: ErrorCode.PARSE_ERROR,
            errorMessage:
                'Integer variation value cannot be represented safely as a JavaScript number'
        });

        const nativeFlags = jest.requireMock(
            '../../../core/src/specs/NativeDdFlags'
        ).default;
        expect(nativeFlags.trackEvaluation).not.toHaveBeenCalled();
    });

    it('starts in ERROR when a context-specific configuration has no OpenFeature context', async () => {
        const { domain, clientName } = freshNames();
        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });
        provider.setConfiguration(
            configurationFromString(wireFor({ targetingKey: 'user-123' }))
        );

        await expect(
            OpenFeature.setProviderAndWait(domain, provider)
        ).rejects.toThrow();

        const client = OpenFeature.getClient(domain);
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);
        expect(client.getBooleanDetails('new-feature', false)).toMatchObject({
            value: false,
            errorCode: ErrorCode.INVALID_CONTEXT
        });
    });

    it('enters ERROR on a mismatching context and recovers on a matching context', async () => {
        const { domain, clientName } = freshNames();
        const configuration = configurationFromString(
            wireFor({ targetingKey: 'user-123' })
        );
        await OpenFeature.setContext(
            domain,
            requiredPrecomputedContext(configuration)
        );
        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });
        provider.setConfiguration(configuration);
        await OpenFeature.setProviderAndWait(domain, provider);

        await OpenFeature.setContext(domain, { targetingKey: 'someone-else' });

        const client = OpenFeature.getClient(domain);
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);
        const details = client.getBooleanDetails('new-feature', false);
        expect(details.value).toBe(false);
        expect(details.errorCode).toBe(ErrorCode.INVALID_CONTEXT);

        await OpenFeature.setContext(domain, { targetingKey: 'user-123' });
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanValue('new-feature', false)).toBe(true);
    });

    it.each([
        ['an empty context', {}],
        ['an empty targeting key', { targetingKey: '' }]
    ])('treats %s as a real context', async (_label, nextContext) => {
        const { domain, clientName } = freshNames();
        const configuration = configurationFromString(
            wireFor({ targetingKey: 'user-123' })
        );
        await OpenFeature.setContext(
            domain,
            requiredPrecomputedContext(configuration)
        );
        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });
        provider.setConfiguration(configuration);
        await OpenFeature.setProviderAndWait(domain, provider);

        await OpenFeature.setContext(domain, nextContext);

        const client = OpenFeature.getClient(domain);
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);
        expect(client.getBooleanDetails('new-feature', false).errorCode).toBe(
            ErrorCode.INVALID_CONTEXT
        );
    });

    it.each([
        ['context-agnostic', undefined, undefined],
        ['explicitly empty', {}, {}]
    ])(
        'starts READY with a %s precomputed context',
        async (_label, wireContext, expectedHelperContext) => {
            const { domain, clientName } = freshNames();
            const configuration = configurationFromString(
                wireFor(wireContext as EvaluationContext | undefined)
            );
            expect(getPrecomputedContext(configuration)).toEqual(
                expectedHelperContext
            );

            const provider = new DatadogOfflineOpenFeatureProvider({
                clientName
            });
            provider.setConfiguration(configuration);
            await OpenFeature.setProviderAndWait(domain, provider);

            expect(OpenFeature.getClient(domain).providerStatus).toBe(
                ProviderStatus.READY
            );
        }
    );

    it('recovers a provider-first setup after the application sets the helper context', async () => {
        const { domain, clientName } = freshNames();
        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });

        await expect(
            OpenFeature.setProviderAndWait(domain, provider)
        ).rejects.toThrow();
        const client = OpenFeature.getClient(domain);
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);

        const configuration = configurationFromString(
            wireFor({ targetingKey: 'user-123' })
        );
        provider.setConfiguration(configuration);
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);

        await OpenFeature.setContext(
            domain,
            requiredPrecomputedContext(configuration)
        );
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanValue('new-feature', false)).toBe(true);
    });

    it('recovers via setConfiguration when a config matching the current context is loaded', async () => {
        const { domain, clientName } = freshNames();
        const configuration = configurationFromString(
            wireFor({ targetingKey: 'user-123' })
        );
        await OpenFeature.setContext(
            domain,
            requiredPrecomputedContext(configuration)
        );
        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });
        provider.setConfiguration(configuration);
        await OpenFeature.setProviderAndWait(domain, provider);

        await OpenFeature.setContext(domain, { targetingKey: 'someone-else' });
        const client = OpenFeature.getClient(domain);
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);

        // Load a configuration computed for the now-current context: it reconciles to ready and
        // setConfiguration emits PROVIDER_READY.
        provider.setConfiguration(
            configurationFromString(wireFor({ targetingKey: 'someone-else' }))
        );
        expect(client.providerStatus).toBe(ProviderStatus.READY);
    });

    describe('domain / global-context isolation', () => {
        it('inherits a matching global context when the domain has no context', async () => {
            const { domain, clientName } = freshNames();
            const provider = new DatadogOfflineOpenFeatureProvider({
                clientName
            });
            provider.setConfiguration(
                configurationFromString(wireFor({ targetingKey: 'user-123' }))
            );

            await OpenFeature.setContext({ targetingKey: 'user-123' });
            await OpenFeature.setProviderAndWait(domain, provider);

            expect(OpenFeature.getClient(domain).providerStatus).toBe(
                ProviderStatus.READY
            );
        });

        it('enters ERROR when a cleared domain inherits an empty global context', async () => {
            const { domain, clientName } = freshNames();
            const configuration = configurationFromString(
                wireFor({ targetingKey: 'user-123' })
            );
            await OpenFeature.setContext(
                domain,
                requiredPrecomputedContext(configuration)
            );
            const provider = new DatadogOfflineOpenFeatureProvider({
                clientName
            });
            provider.setConfiguration(configuration);
            await OpenFeature.setProviderAndWait(domain, provider);

            await OpenFeature.clearContext(domain);

            expect(OpenFeature.getClient(domain).providerStatus).toBe(
                ProviderStatus.ERROR
            );
        });

        it('stays READY when a cleared domain inherits a matching global context', async () => {
            const { domain, clientName } = freshNames();
            const configuration = configurationFromString(
                wireFor({ targetingKey: 'user-123' })
            );
            await OpenFeature.setContext({ targetingKey: 'user-123' });
            await OpenFeature.setContext(domain, {
                targetingKey: 'user-123'
            });
            const provider = new DatadogOfflineOpenFeatureProvider({
                clientName
            });
            provider.setConfiguration(configuration);
            await OpenFeature.setProviderAndWait(domain, provider);

            await OpenFeature.clearContext(domain);
            expect(OpenFeature.getClient(domain).providerStatus).toBe(
                ProviderStatus.READY
            );
        });

        it('falls back to a mismatching global context when the domain context is cleared', async () => {
            const { domain, clientName } = freshNames();
            const provider = new DatadogOfflineOpenFeatureProvider({
                clientName
            });
            provider.setConfiguration(
                configurationFromString(wireFor({ targetingKey: 'user-123' }))
            );

            await OpenFeature.setContext(domain, { targetingKey: 'user-123' });
            await OpenFeature.setProviderAndWait(domain, provider);
            expect(OpenFeature.getClient(domain).providerStatus).toBe(
                ProviderStatus.READY
            );

            await OpenFeature.setContext({ targetingKey: 'global-mismatch' });
            expect(OpenFeature.getClient(domain).providerStatus).toBe(
                ProviderStatus.READY
            );

            await OpenFeature.clearContext(domain);
            expect(OpenFeature.getClient(domain).providerStatus).toBe(
                ProviderStatus.ERROR
            );
        });
    });
});
