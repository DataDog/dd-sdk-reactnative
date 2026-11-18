/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { configurationToString } from '@datadog/flagging-core/rules-based';
import { DdRum } from '@datadog/mobile-react-native';
import { ErrorCode, OpenFeature } from '@openfeature/web-sdk';
import { Platform } from 'react-native';

import { getNativeDdFlags } from '../../../core/src/specs/NativeDdFlags';
import type { DatadogTrackingHook, DatadogTrackingHooks } from '../index';
import {
    coreConfigurationFromString,
    DatadogCoreProvider,
    fetchPrecomputedConfiguration,
    fetchRulesConfiguration
} from '../rules-based';
import {
    composeDatadogTrackingHooks,
    createDatadogEvaluationLoggingHook,
    createDatadogExposureLoggingHook,
    createDatadogRumTrackingHook
} from '../tracking';

import {
    matchingContext,
    precomputedConfiguration,
    rulesConfiguration,
    rulesWire
} from './__utils__/coreConfiguration';
import { encodedConfiguration } from './__utils__/encodedConfiguration';

// Exercise the real evaluator, OpenFeature lifecycle, and JS bridge adapter. Only native
// delivery is mocked; its promises deliberately never resolve to detect accidental awaiting.
jest.mock('../../../core/src/specs/NativeDdFlags', () => ({
    __esModule: true,
    getNativeDdFlags: jest.fn().mockReturnValue({
        enable: jest.fn(),
        setEvaluationContext: jest.fn(),
        trackEvaluation: jest.fn(),
        trackExposure: jest.fn(() => new Promise(() => {})),
        trackProtectedEvaluation: jest.fn(() => new Promise(() => {})),
        trackRumEvaluation: jest.fn(() => new Promise(() => {}))
    })
}));

const NativeDdFlags = getNativeDdFlags();
if (!NativeDdFlags) {
    throw new Error('Native flags test double is required');
}
const native = jest.mocked(NativeDdFlags);
const rum = native.trackRumEvaluation;
let sequence = 0;

async function configuredClient(
    tracking?: DatadogTrackingHooks,
    rules = false
) {
    const domain = `tracking-${++sequence}`;
    const provider = new DatadogCoreProvider();
    provider.setConfiguration(
        rules ? rulesConfiguration() : precomputedConfiguration()
    );
    await OpenFeature.setProviderAndWait(domain, provider, matchingContext);
    const client = OpenFeature.getClient(domain);
    if (tracking) {
        await tracking.initialize();
        client.addHooks(...tracking.hooks);
    }
    return { client, provider, domain };
}

describe.each(['android', 'ios'] as const)(
    'optional native tracking hooks on %s',
    platform => {
        beforeEach(() => {
            jest.clearAllMocks();
            jest.replaceProperty(Platform, 'OS', platform);
            jest.spyOn(DdRum, 'addFeatureFlagEvaluation').mockImplementation(
                () => new Promise(() => {})
            );
        });

        afterEach(async () => {
            expect(DdRum.addFeatureFlagEvaluation).not.toHaveBeenCalled();
            await OpenFeature.clearProviders();
            await OpenFeature.clearContext();
            jest.restoreAllMocks();
            jest.useRealTimers();
        });

        it('never forwards assignment authorization to any native tracking operation', async () => {
            const { client, domain } = await configuredClient(
                composeDatadogTrackingHooks(
                    createDatadogExposureLoggingHook(),
                    createDatadogEvaluationLoggingHook(),
                    createDatadogRumTrackingHook()
                )
            );
            await OpenFeature.setContext(domain, {
                ...matchingContext,
                dd_assignment_token: 'synthetic-credential'
            });
            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
            expect(client.getBooleanDetails('missing', false).errorCode).toBe(
                ErrorCode.FLAG_NOT_FOUND
            );
            for (const operation of [
                native.trackExposure,
                native.trackProtectedEvaluation,
                rum
            ]) {
                expect(operation).toHaveBeenCalled();
                for (const call of operation.mock.calls) {
                    expect(call[4]).toEqual({ country: 'US' });
                    expect(JSON.stringify(call)).not.toContain(
                        'synthetic-credential'
                    );
                }
            }
        });

        it('does not track when no hooks are registered', async () => {
            const { client } = await configuredClient();
            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
            expect(native.trackExposure).not.toHaveBeenCalled();
            expect(native.trackProtectedEvaluation).not.toHaveBeenCalled();
            expect(native.trackEvaluation).not.toHaveBeenCalled();
            expect(rum).not.toHaveBeenCalled();
        });

        it.each([
            { rules: false, doLog: false },
            { rules: false, doLog: true },
            { rules: true, doLog: false },
            { rules: true, doLog: true }
        ])(
            'preserves assigned DEFAULT results with rules=$rules and doLog=$doLog',
            async ({ rules, doLog }) => {
                const { client, provider } = await configuredClient(
                    composeDatadogTrackingHooks(
                        createDatadogExposureLoggingHook(),
                        createDatadogEvaluationLoggingHook(),
                        createDatadogRumTrackingHook()
                    ),
                    rules
                );
                const key = rules ? 'test-flag' : 'boolean-flag';
                if (rules) {
                    const configuration = rulesConfiguration();
                    configuration.rules.response.flags[
                        key
                    ].allocations[0].splits[0].reason = 4;
                    configuration.rules.response.flags[
                        key
                    ].allocations[0].logExposureEvent = doLog;
                    provider.setConfiguration(
                        coreConfigurationFromString(
                            configurationToString(configuration)
                        )
                    );
                } else {
                    const configuration = precomputedConfiguration();
                    configuration.precomputed.response.data.attributes.flags[
                        key
                    ].reason = 'DEFAULT';
                    configuration.precomputed.response.data.attributes.flags[
                        key
                    ].doLog = doLog;
                    provider.setConfiguration(configuration);
                }

                expect(client.getBooleanDetails(key, false)).toMatchObject({
                    value: true,
                    reason: 'DEFAULT',
                    variant: 'on'
                });
                expect(native.trackExposure).toHaveBeenCalledTimes(
                    doLog ? 1 : 0
                );
                expect(native.trackProtectedEvaluation).toHaveBeenCalledWith(
                    'default',
                    key,
                    expect.objectContaining({
                        allocationKey: 'allocation',
                        variationKey: 'on',
                        doLog
                    }),
                    'user-1',
                    { country: 'US' },
                    null,
                    false,
                    'user-1'
                );
                expect(rum).toHaveBeenCalledTimes(1);
            }
        );

        it('keeps an assignment-free coded default unassigned', async () => {
            const { client, provider } = await configuredClient(
                composeDatadogTrackingHooks(
                    createDatadogExposureLoggingHook(),
                    createDatadogEvaluationLoggingHook(),
                    createDatadogRumTrackingHook()
                ),
                true
            );
            const configuration = rulesConfiguration();
            configuration.rules.response.flags['test-flag'].allocations = [];
            provider.setConfiguration(
                coreConfigurationFromString(
                    configurationToString(configuration)
                )
            );

            expect(client.getBooleanDetails('test-flag', false)).toMatchObject({
                value: false,
                reason: 'DEFAULT'
            });
            expect(native.trackExposure).not.toHaveBeenCalled();
            expect(rum).not.toHaveBeenCalled();
            expect(native.trackProtectedEvaluation).toHaveBeenCalledWith(
                'default',
                'test-flag',
                null,
                'user-1',
                { country: 'US' },
                null,
                false,
                'user-1'
            );
        });

        it('treats ERROR without an error code as GENERAL despite assignment metadata', async () => {
            const { client, provider } = await configuredClient(
                composeDatadogTrackingHooks(
                    createDatadogExposureLoggingHook(),
                    createDatadogEvaluationLoggingHook(),
                    createDatadogRumTrackingHook()
                )
            );
            const configuration = precomputedConfiguration();
            configuration.precomputed.response.data.attributes.flags[
                'boolean-flag'
            ].reason = 'ERROR';
            provider.setConfiguration(configuration);
            expect(
                client.getBooleanDetails('boolean-flag', false)
            ).toMatchObject({
                value: true,
                reason: 'ERROR'
            });
            expect(native.trackExposure).not.toHaveBeenCalled();
            expect(rum).not.toHaveBeenCalled();
            expect(native.trackProtectedEvaluation).toHaveBeenCalledWith(
                'default',
                'boolean-flag',
                null,
                'user-1',
                { country: 'US' },
                'GENERAL',
                false,
                'user-1'
            );
        });

        it.each([false, true])(
            'does not serialize unused object values with doLog: %s',
            async doLog => {
                const { client, provider } = await configuredClient(
                    composeDatadogTrackingHooks(
                        createDatadogExposureLoggingHook(),
                        createDatadogEvaluationLoggingHook()
                    )
                );
                const configuration = precomputedConfiguration();
                const flag =
                    configuration.precomputed.response.data.attributes.flags[
                        'object-flag'
                    ];
                flag.doLog = doLog;
                flag.variationValue = { payload: 'x'.repeat(64 * 1024) };
                provider.setConfiguration(configuration);
                const stringify = jest.spyOn(JSON, 'stringify');
                const value = client.getObjectValue('object-flag', {});
                expect(value).toEqual(flag.variationValue);
                expect(
                    stringify.mock.calls.filter(([input]) => input === value)
                ).toHaveLength(0);
                expect(native.trackExposure).toHaveBeenCalledTimes(
                    doLog ? 1 : 0
                );
                expect(native.trackProtectedEvaluation).toHaveBeenCalledWith(
                    'default',
                    'object-flag',
                    expect.objectContaining({
                        allocationKey: 'allocation',
                        variationKey: 'settings',
                        doLog
                    }),
                    'user-1',
                    { country: 'US' },
                    null,
                    false,
                    'user-1'
                );
                expect(
                    native.trackProtectedEvaluation.mock.calls[0][2]
                ).not.toHaveProperty('value');
                expect(
                    native.trackProtectedEvaluation.mock.calls[0][2]
                ).not.toHaveProperty('variationValue');
            }
        );

        it('does not warn or track for a client without optional hooks', async () => {
            jest.spyOn(console, 'warn').mockImplementation(() => {});
            const { client } = await configuredClient();

            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
            expect(console.warn).not.toHaveBeenCalled();
            expect(native.trackExposure).not.toHaveBeenCalled();
            expect(native.trackProtectedEvaluation).not.toHaveBeenCalled();
            expect(native.trackRumEvaluation).not.toHaveBeenCalled();
            expect(native.trackEvaluation).not.toHaveBeenCalled();
        });

        it.each([
            ['exposure', createDatadogExposureLoggingHook, 1, 0, 0],
            ['evaluation', createDatadogEvaluationLoggingHook, 0, 1, 0],
            ['RUM', createDatadogRumTrackingHook, 0, 0, 1]
        ] as const)(
            'selects only the %s operation',
            async (_name, create, exposures, evaluations, rumCalls) => {
                const { client } = await configuredClient(create());
                expect(client.getBooleanValue('boolean-flag', false)).toBe(
                    true
                );
                expect(native.trackExposure).toHaveBeenCalledTimes(exposures);
                expect(native.trackProtectedEvaluation).toHaveBeenCalledTimes(
                    evaluations
                );
                expect(rum).toHaveBeenCalledTimes(rumCalls);
                expect(native.trackEvaluation).not.toHaveBeenCalled();
                expect(native.enable).not.toHaveBeenCalled();
                expect(native.setEvaluationContext).not.toHaveBeenCalled();
            }
        );

        describe.each([false, true])('with rules configuration: %s', rules => {
            it.each([
                ['exposure', createDatadogExposureLoggingHook],
                ['evaluation', createDatadogEvaluationLoggingHook],
                ['RUM', createDatadogRumTrackingHook]
            ] as const)(
                'tracks %s without affecting evaluation',
                async (_name, create) => {
                    jest.spyOn(console, 'warn').mockImplementation(() => {});
                    const tracking = create();
                    const { client } = await configuredClient(tracking, rules);
                    const flagKey = rules ? 'test-flag' : 'boolean-flag';

                    await tracking.initialize();
                    for (let i = 0; i < 10; i++) {
                        expect(client.getBooleanValue(flagKey, false)).toBe(
                            true
                        );
                    }
                    await tracking.shutdown();
                    await tracking.initialize();
                    expect(client.getBooleanValue(flagKey, false)).toBe(true);

                    expect(console.warn).not.toHaveBeenCalled();
                    expect(native.trackExposure).toHaveBeenCalledTimes(
                        _name === 'exposure' ? 11 : 0
                    );
                    expect(
                        native.trackProtectedEvaluation
                    ).toHaveBeenCalledTimes(_name === 'evaluation' ? 11 : 0);
                    expect(native.trackRumEvaluation).toHaveBeenCalledTimes(
                        _name === 'RUM' ? 11 : 0
                    );
                    expect(native.trackEvaluation).not.toHaveBeenCalled();
                    expect(native.enable).not.toHaveBeenCalled();
                    expect(native.setEvaluationContext).not.toHaveBeenCalled();
                }
            );
        });

        it('submits each record immediately, without JS batching or deduplication', async () => {
            const tracking = composeDatadogTrackingHooks(
                createDatadogExposureLoggingHook({
                    clientName: 'native-owner'
                }),
                createDatadogEvaluationLoggingHook({
                    clientName: 'native-owner'
                }),
                createDatadogRumTrackingHook({ clientName: 'native-owner' })
            );
            const { client } = await configuredClient(tracking);
            jest.useFakeTimers();
            for (let i = 0; i < 10; i++) {
                expect(client.getBooleanValue('boolean-flag', false)).toBe(
                    true
                );
                expect(native.trackExposure).toHaveBeenCalledTimes(i + 1);
                expect(native.trackProtectedEvaluation).toHaveBeenCalledTimes(
                    i + 1
                );
                expect(rum).toHaveBeenCalledTimes(i + 1);
            }
            expect(jest.getTimerCount()).toBe(0);
            expect(native.trackEvaluation).not.toHaveBeenCalled();
            expect(native.trackExposure).toHaveBeenLastCalledWith(
                'native-owner',
                'boolean-flag',
                expect.objectContaining({
                    allocationKey: 'allocation',
                    variationKey: 'on',
                    doLog: true
                }),
                'user-1',
                { country: 'US' }
            );
            expect(rum).toHaveBeenLastCalledWith(
                'native-owner',
                'boolean-flag',
                'on',
                'user-1',
                { country: 'US' }
            );
        });

        it('does not suppress evaluation or RUM when doLog is false', async () => {
            const { client } = await configuredClient(
                composeDatadogTrackingHooks(
                    createDatadogExposureLoggingHook(),
                    createDatadogEvaluationLoggingHook(),
                    createDatadogRumTrackingHook()
                )
            );
            expect(client.getStringValue('string-flag', '')).toBe('hello');
            expect(native.trackExposure).not.toHaveBeenCalled();
            expect(native.trackProtectedEvaluation).toHaveBeenCalledWith(
                'default',
                'string-flag',
                expect.objectContaining({
                    doLog: false,
                    variationKey: 'greeting'
                }),
                'user-1',
                { country: 'US' },
                null,
                false,
                'user-1'
            );
            expect(rum).toHaveBeenCalledWith(
                'default',
                'string-flag',
                'greeting',
                'user-1',
                { country: 'US' }
            );
        });

        it('records errors once without an assignment, exposure, or RUM event', async () => {
            const { client } = await configuredClient(
                composeDatadogTrackingHooks(
                    createDatadogExposureLoggingHook(),
                    createDatadogEvaluationLoggingHook(),
                    createDatadogRumTrackingHook()
                )
            );
            expect(client.getBooleanDetails('missing', false).errorCode).toBe(
                ErrorCode.FLAG_NOT_FOUND
            );
            expect(client.getNumberDetails('boolean-flag', 42).errorCode).toBe(
                ErrorCode.TYPE_MISMATCH
            );
            expect(native.trackProtectedEvaluation.mock.calls).toEqual([
                [
                    'default',
                    'missing',
                    null,
                    'user-1',
                    { country: 'US' },
                    ErrorCode.FLAG_NOT_FOUND,
                    false,
                    'user-1'
                ],
                [
                    'default',
                    'boolean-flag',
                    null,
                    'user-1',
                    { country: 'US' },
                    ErrorCode.TYPE_MISMATCH,
                    false,
                    'user-1'
                ]
            ]);
            expect(native.trackExposure).not.toHaveBeenCalled();
            expect(rum).not.toHaveBeenCalled();
        });

        it('captures each rules evaluation context without updating the native client context', async () => {
            const { client, domain } = await configuredClient(
                createDatadogEvaluationLoggingHook(),
                true
            );
            expect(client.getBooleanValue('test-flag', false)).toBe(true);
            await OpenFeature.setContext(domain, {
                targetingKey: 'user-2',
                country: 'CA',
                nested: { ignored: true }
            });
            expect(client.getBooleanValue('test-flag', true)).toBe(false);
            expect(
                native.trackProtectedEvaluation.mock.calls.map(call =>
                    call.slice(3, 5)
                )
            ).toEqual([
                ['user-1', { country: 'US' }],
                ['user-2', { country: 'CA' }]
            ]);
            expect(native.setEvaluationContext).not.toHaveBeenCalled();
        });

        it('passes opt-out context to the selected native RUM tracking client', async () => {
            const { client, domain } = await configuredClient(
                createDatadogRumTrackingHook({ clientName: 'opt-out-owner' }),
                true
            );
            await OpenFeature.setContext(domain, {
                ...matchingContext,
                dd_evaluation_telemetry_opt_out: true
            });

            expect(client.getBooleanValue('test-flag', false)).toBe(true);
            expect(rum).toHaveBeenCalledWith(
                'opt-out-owner',
                'test-flag',
                'on',
                'user-1',
                { country: 'US', dd_evaluation_telemetry_opt_out: true }
            );
            expect(native.trackExposure).not.toHaveBeenCalled();
            expect(native.trackProtectedEvaluation).not.toHaveBeenCalled();
            expect(native.setEvaluationContext).not.toHaveBeenCalled();
        });

        it.each([precomputedConfiguration, encodedConfiguration])(
            'evaluates a fetched snapshot from %p and tracks only with explicitly registered hooks',
            async make => {
                const fetch = jest.fn().mockResolvedValue({
                    ok: true,
                    json: async () => make().precomputed.response
                });
                const context = {
                    ...matchingContext,
                    dd_assignment_token: 'synthetic-credential'
                };
                const configuration = await fetchPrecomputedConfiguration({
                    clientToken: 'test-client-token',
                    env: 'production',
                    context,
                    fetch
                });
                const provider = new DatadogCoreProvider();
                provider.setConfiguration(configuration);
                const domain = `tracking-${++sequence}`;
                await OpenFeature.setProviderAndWait(domain, provider, context);
                const client = OpenFeature.getClient(domain);
                expect(client.getBooleanValue('boolean-flag', false)).toBe(
                    true
                );
                expect(native.trackExposure).not.toHaveBeenCalled();
                expect(rum).not.toHaveBeenCalled();

                const tracking = composeDatadogTrackingHooks(
                    createDatadogExposureLoggingHook(),
                    createDatadogRumTrackingHook()
                );
                await tracking.initialize();
                client.addHooks(...tracking.hooks);
                expect(client.getBooleanValue('boolean-flag', false)).toBe(
                    true
                );
                expect(native.trackExposure).toHaveBeenCalledWith(
                    'default',
                    'boolean-flag',
                    expect.objectContaining({ variationKey: 'on' }),
                    'user-1',
                    { country: 'US' }
                );
                expect(rum).toHaveBeenCalledTimes(1);
                await OpenFeature.setContext(domain, {
                    targetingKey: 'other',
                    country: 'CA'
                });
                expect(
                    client.getBooleanDetails('boolean-flag', false)
                ).toMatchObject({
                    value: false,
                    errorCode: ErrorCode.INVALID_CONTEXT
                });
                expect(native.trackExposure).toHaveBeenCalledTimes(1);
                expect(rum).toHaveBeenCalledTimes(1);
                expect(fetch).toHaveBeenCalledTimes(1);
                expect(native.enable).not.toHaveBeenCalled();
                expect(native.setEvaluationContext).not.toHaveBeenCalled();
                await tracking.shutdown();
            }
        );

        it('tracks fetched rules without fetching again for context changes or hook cleanup', async () => {
            const bytes = Uint8Array.from(
                Buffer.from(JSON.parse(rulesWire).rules.response, 'base64')
            );
            const fetch = jest.fn().mockResolvedValue({
                ok: true,
                arrayBuffer: async () => bytes.buffer
            });
            const configuration = await fetchRulesConfiguration({
                clientToken: 'test-token',
                env: 'test',
                fetch
            });
            const provider = new DatadogCoreProvider();
            provider.setConfiguration(configuration);
            const domain = `tracking-${++sequence}`;
            await OpenFeature.setProviderAndWait(
                domain,
                provider,
                matchingContext
            );
            const client = OpenFeature.getClient(domain);
            client.getBooleanValue('test-flag', false);
            expect(native.trackExposure).not.toHaveBeenCalled();

            expect(rum).not.toHaveBeenCalled();

            const tracking = composeDatadogTrackingHooks(
                createDatadogExposureLoggingHook(),
                createDatadogRumTrackingHook()
            );
            await tracking.initialize();
            client.addHooks(...tracking.hooks);
            expect(client.getBooleanValue('test-flag', false)).toBe(true);
            await OpenFeature.setContext(domain, {
                targetingKey: 'user-2',
                country: 'CA'
            });
            expect(client.getBooleanValue('test-flag', true)).toBe(false);
            client.clearHooks();
            await tracking.shutdown();
            expect(client.getBooleanValue('test-flag', true)).toBe(false);

            expect(fetch).toHaveBeenCalledTimes(1);
            expect(provider.getConfiguration()).toBe(configuration);
            expect(native.trackExposure).toHaveBeenCalledTimes(1);

            expect(rum).toHaveBeenCalledTimes(2);
            expect(native.trackEvaluation).not.toHaveBeenCalled();
            expect(native.enable).not.toHaveBeenCalled();
            expect(native.setEvaluationContext).not.toHaveBeenCalled();
        });

        it('uses refreshed rules and tracking metadata without registering hooks again', async () => {
            // Re-encode changed rules so both requests exercise the actual protobuf decoder.
            const replacement = rulesConfiguration();
            const replacementFlag =
                replacement.rules.response.flags['test-flag'];
            replacementFlag.variations[0].value = {
                case: 'booleanValue',
                value: false
            };
            replacement.rules.response.strings[
                replacementFlag.variations[0].keyStringIndex
            ] = 'refreshed-off';
            replacementFlag.allocations[0].key = 'refreshed-allocation';
            replacementFlag.allocations[0].splits[0].serialId = 8;
            const responses = [
                rulesWire,
                configurationToString(replacement)
            ].map(wire => {
                const bytes = Uint8Array.from(
                    Buffer.from(JSON.parse(wire).rules.response, 'base64')
                );
                return { ok: true, arrayBuffer: async () => bytes.buffer };
            });
            const fetch = jest
                .fn()
                .mockResolvedValueOnce(responses[0])
                .mockResolvedValueOnce(responses[1]);
            const fetchOptions = {
                clientToken: 'test-token',
                env: 'test',
                fetch
            };
            const provider = new DatadogCoreProvider();
            provider.setConfiguration(
                await fetchRulesConfiguration(fetchOptions)
            );
            const domain = `tracking-${++sequence}`;
            await OpenFeature.setProviderAndWait(
                domain,
                provider,
                matchingContext
            );
            const client = OpenFeature.getClient(domain);
            const addHooks = jest.spyOn(client, 'addHooks');
            const tracking = composeDatadogTrackingHooks(
                createDatadogExposureLoggingHook({
                    clientName: 'refresh-owner'
                }),
                createDatadogRumTrackingHook()
            );
            await tracking.initialize();
            client.addHooks(...tracking.hooks);
            expect(native.trackExposure).not.toHaveBeenCalled();

            expect(rum).not.toHaveBeenCalled();

            expect(client.getBooleanDetails('test-flag', false)).toMatchObject({
                value: true,
                variant: 'on',
                flagMetadata: {
                    allocationKey: 'allocation',
                    __dd_split_serial_id: 7
                }
            });
            const refreshed = await fetchRulesConfiguration(fetchOptions);
            provider.setConfiguration(refreshed);
            expect(native.trackExposure).toHaveBeenCalledTimes(1);

            expect(rum).toHaveBeenCalledTimes(1);

            expect(client.getBooleanDetails('test-flag', true)).toMatchObject({
                value: false,
                variant: 'refreshed-off',
                flagMetadata: {
                    allocationKey: 'refreshed-allocation',
                    __dd_split_serial_id: 8
                }
            });
            const expectedRecords = [
                [
                    'refresh-owner',
                    'test-flag',
                    {
                        variationKey: 'on',
                        allocationKey: 'allocation',
                        serialId: '7',
                        doLog: true
                    },
                    'user-1',
                    { country: 'US' }
                ],
                [
                    'refresh-owner',
                    'test-flag',
                    {
                        variationKey: 'refreshed-off',
                        allocationKey: 'refreshed-allocation',
                        serialId: '8',
                        doLog: true
                    },
                    'user-1',
                    { country: 'US' }
                ]
            ];
            expect(native.trackExposure.mock.calls).toEqual(expectedRecords);

            expect(rum.mock.calls).toEqual([
                ['default', 'test-flag', 'on', 'user-1', { country: 'US' }],
                [
                    'default',
                    'test-flag',
                    'refreshed-off',
                    'user-1',
                    { country: 'US' }
                ]
            ]);
            expect(provider.getConfiguration()).toBe(refreshed);
            expect(addHooks).toHaveBeenCalledTimes(1);
            expect(fetch).toHaveBeenCalledTimes(2);
            expect(native.trackEvaluation).not.toHaveBeenCalled();
            expect(native.enable).not.toHaveBeenCalled();
            expect(native.setEvaluationContext).not.toHaveBeenCalled();
        });

        it('preserves split serial IDs for native exposure deduplication', async () => {
            const { client, provider } = await configuredClient(
                createDatadogExposureLoggingHook()
            );
            const configuration = precomputedConfiguration();
            configuration.precomputed.response.data.attributes.flags[
                'boolean-flag'
            ].serialId = 123;
            provider.setConfiguration(configuration);
            client.getBooleanValue('boolean-flag', false);
            expect(native.trackExposure.mock.calls[0][2]).toMatchObject({
                serialId: '123'
            });
        });

        it('activates and stops only its own hooks, without managing the shared native SDK', async () => {
            const exposure = createDatadogExposureLoggingHook();
            const evaluation = createDatadogEvaluationLoggingHook();
            const { client } = await configuredClient(evaluation);
            client.addHooks(...exposure.hooks);
            client.getBooleanValue('boolean-flag', false);
            expect(native.trackExposure).not.toHaveBeenCalled();
            await exposure.initialize();
            await exposure.initialize();
            client.getBooleanValue('boolean-flag', false);
            await exposure.shutdown();
            await exposure.shutdown();
            client.getBooleanValue('boolean-flag', false);
            expect(native.trackExposure).toHaveBeenCalledTimes(1);
            expect(native.trackProtectedEvaluation).toHaveBeenCalledTimes(3);
            expect(native.enable).not.toHaveBeenCalled();
        });

        it('isolates synchronous bridge errors and rejected native promises from evaluation', async () => {
            native.trackExposure.mockImplementationOnce(() => {
                throw new Error('bridge unavailable');
            });
            native.trackProtectedEvaluation.mockRejectedValueOnce(
                new Error('native unavailable')
            );
            rum.mockRejectedValueOnce(new Error('RUM unavailable'));
            const { client } = await configuredClient(
                composeDatadogTrackingHooks(
                    createDatadogExposureLoggingHook(),
                    createDatadogEvaluationLoggingHook(),
                    createDatadogRumTrackingHook()
                )
            );
            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
            await Promise.resolve();
            expect(native.trackExposure).toHaveBeenCalledTimes(1);
            expect(native.trackProtectedEvaluation).toHaveBeenCalledTimes(1);
            expect(rum).toHaveBeenCalledTimes(1);
        });

        it('unregisters tracking with the documented clearHooks and shutdown sequence', async () => {
            const tracking = composeDatadogTrackingHooks(
                createDatadogExposureLoggingHook(),
                createDatadogEvaluationLoggingHook(),
                createDatadogRumTrackingHook()
            );
            const { client } = await configuredClient(tracking);
            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
            client.clearHooks();
            await tracking.shutdown();
            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
            expect(native.trackExposure).toHaveBeenCalledTimes(1);
            expect(native.trackProtectedEvaluation).toHaveBeenCalledTimes(1);
            expect(rum).toHaveBeenCalledTimes(1);
            expect(native.enable).not.toHaveBeenCalled();
        });

        it('restarts the same tracking controller without duplicate registrations', async () => {
            const tracking = composeDatadogTrackingHooks(
                createDatadogExposureLoggingHook(),
                createDatadogEvaluationLoggingHook(),
                createDatadogRumTrackingHook()
            );
            const { client } = await configuredClient(tracking);
            const expectRecords = (count: number) => {
                expect(native.trackExposure).toHaveBeenCalledTimes(count);
                expect(native.trackProtectedEvaluation).toHaveBeenCalledTimes(
                    count
                );
                expect(rum).toHaveBeenCalledTimes(count);
            };

            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
            expectRecords(1);
            client.clearHooks();
            await tracking.shutdown();
            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
            expectRecords(1);

            await tracking.initialize();
            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
            expectRecords(1);
            client.addHooks(...tracking.hooks);
            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
            expectRecords(2);
            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
            expectRecords(3);
            expect(native.trackEvaluation).not.toHaveBeenCalled();
            expect(native.enable).not.toHaveBeenCalled();
            expect(native.setEvaluationContext).not.toHaveBeenCalled();
        });

        it('routes named clients independently and keeps one active when the other stops', async () => {
            const firstTracking = composeDatadogTrackingHooks(
                createDatadogExposureLoggingHook({
                    clientName: 'native-first'
                }),
                createDatadogEvaluationLoggingHook({
                    clientName: 'native-first'
                })
            );
            const secondTracking = composeDatadogTrackingHooks(
                createDatadogExposureLoggingHook({
                    clientName: 'native-second'
                }),
                createDatadogEvaluationLoggingHook({
                    clientName: 'native-second'
                })
            );
            const first = await configuredClient(firstTracking, true);
            const second = await configuredClient(secondTracking, true);
            await OpenFeature.setContext(second.domain, {
                targetingKey: 'user-2',
                country: 'US',
                tier: 'premium'
            });

            expect(first.client.getBooleanValue('test-flag', false)).toBe(true);
            expect(second.client.getBooleanValue('test-flag', false)).toBe(
                true
            );
            first.client.clearHooks();
            await firstTracking.shutdown();
            expect(first.client.getBooleanValue('test-flag', false)).toBe(true);
            expect(second.client.getBooleanValue('test-flag', false)).toBe(
                true
            );

            const assignment = expect.objectContaining({
                allocationKey: 'allocation',
                variationKey: 'on',
                doLog: true
            });
            const expectedRecords = [
                [
                    'native-first',
                    'test-flag',
                    assignment,
                    'user-1',
                    { country: 'US' }
                ],
                [
                    'native-second',
                    'test-flag',
                    assignment,
                    'user-2',
                    { country: 'US', tier: 'premium' }
                ],
                [
                    'native-second',
                    'test-flag',
                    assignment,
                    'user-2',
                    { country: 'US', tier: 'premium' }
                ]
            ];
            expect(native.trackExposure.mock.calls).toEqual(expectedRecords);
            expect(native.trackProtectedEvaluation.mock.calls).toEqual(
                expectedRecords.map(record => [
                    ...record,
                    null,
                    false,
                    record[3]
                ])
            );
            expect(rum).not.toHaveBeenCalled();
            expect(native.trackEvaluation).not.toHaveBeenCalled();
            expect(native.enable).not.toHaveBeenCalled();
            expect(native.setEvaluationContext).not.toHaveBeenCalled();
        });

        describe('evaluation telemetry privacy', () => {
            it.each([undefined, false, true, 'true', 1])(
                'requires explicit boolean consent for full evaluation data: %p',
                async policy => {
                    const { client, provider } = await configuredClient(
                        createDatadogEvaluationLoggingHook()
                    );
                    jest.spyOn(
                        provider,
                        'resolveBooleanEvaluation'
                    ).mockReturnValue({
                        value: true,
                        reason: 'STATIC',
                        flagMetadata:
                            policy === undefined
                                ? {}
                                : {
                                      __dd_observe_full_evaluation_data: policy
                                  }
                    });
                    expect(client.getBooleanValue('boolean-flag', false)).toBe(
                        true
                    );
                    expect(
                        native.trackProtectedEvaluation.mock.calls[0][6]
                    ).toBe(policy === true);
                }
            );

            it.each([false, true])(
                'uses captured full-data policy %s after configuration replacement',
                async observeFullEvaluationData => {
                    const { client, provider } = await configuredClient(
                        createDatadogEvaluationLoggingHook(),
                        true
                    );
                    const configuration = rulesConfiguration();
                    configuration.rules.response.observeFullEvaluationData = observeFullEvaluationData;
                    provider.setConfiguration(configuration);
                    client.addHooks({
                        after: () => {
                            const next = rulesConfiguration();
                            next.rules.response.observeFullEvaluationData = !observeFullEvaluationData;
                            provider.setConfiguration(next);
                        }
                    });

                    expect(client.getBooleanValue('test-flag', false)).toBe(
                        true
                    );
                    expect(
                        native.trackProtectedEvaluation
                    ).toHaveBeenLastCalledWith(
                        'default',
                        'test-flag',
                        expect.objectContaining({ variationKey: 'on' }),
                        'user-1',
                        { country: 'US' },
                        null,
                        observeFullEvaluationData,
                        'user-1'
                    );
                }
            );

            it.each([false, true])(
                'preserves full-data policy %s for errors without an assignment',
                async observeFullEvaluationData => {
                    const { client, provider } = await configuredClient(
                        createDatadogEvaluationLoggingHook(),
                        true
                    );
                    const configuration = rulesConfiguration();
                    configuration.rules.response.observeFullEvaluationData = observeFullEvaluationData;
                    provider.setConfiguration(configuration);
                    expect(
                        client.getBooleanDetails('missing', false).errorCode
                    ).toBe(ErrorCode.FLAG_NOT_FOUND);
                    expect(
                        native.trackProtectedEvaluation
                    ).toHaveBeenLastCalledWith(
                        'default',
                        'missing',
                        null,
                        'user-1',
                        { country: 'US' },
                        ErrorCode.FLAG_NOT_FOUND,
                        observeFullEvaluationData,
                        'user-1'
                    );
                }
            );

            it.each([
                [undefined, null],
                ['', ''],
                ['subject-\u00e9', 'subject-\u00e9'],
                ['\ud800', null],
                ['\udfff', null]
            ])(
                'captures telemetry identity %p as %p without hashing in JS',
                async (targetingKey, telemetryTargetingKey) => {
                    const { client, domain } = await configuredClient(
                        createDatadogEvaluationLoggingHook(),
                        true
                    );
                    await OpenFeature.setContext(domain, {
                        targetingKey,
                        country: 'US'
                    });
                    client.getBooleanValue('missing', false);
                    const call = native.trackProtectedEvaluation.mock.calls[0];
                    expect(call[3]).toBe(targetingKey ?? '');
                    expect(call[6]).toBe(false);
                    expect(call[7]).toBe(telemetryTargetingKey);
                }
            );

            it('never falls back to an unprotected bridge operation', async () => {
                const protectedMethod = native.trackProtectedEvaluation;
                const legacy = jest.fn();
                Reflect.deleteProperty(native, 'trackProtectedEvaluation');
                Object.assign(native, { trackEvaluationEvent: legacy });
                try {
                    const { client } = await configuredClient(
                        createDatadogEvaluationLoggingHook()
                    );
                    expect(client.getBooleanValue('boolean-flag', false)).toBe(
                        true
                    );
                    expect(legacy).not.toHaveBeenCalled();
                } finally {
                    Object.assign(native, {
                        trackProtectedEvaluation: protectedMethod
                    });
                    Reflect.deleteProperty(native, 'trackEvaluationEvent');
                }
            });
        });

        describe('composition lifecycle', () => {
            it('accepts lifecycle-free hooks and optional synchronous methods without starting them', async () => {
                const firstHook = { finally: jest.fn() };
                const secondHook = { finally: jest.fn() };
                const initialize = jest.fn();
                const shutdown = jest.fn();
                const hooksOnly: DatadogTrackingHook = { hooks: [firstHook] };
                const tracking = composeDatadogTrackingHooks(
                    hooksOnly,
                    { hooks: [secondHook], initialize },
                    { hooks: [], shutdown }
                );

                expect(tracking.hooks).toEqual([firstHook, secondHook]);
                expect(initialize).not.toHaveBeenCalled();
                expect(shutdown).not.toHaveBeenCalled();
                const { client } = await configuredClient(tracking);
                expect(initialize).toHaveBeenCalledTimes(1);
                expect(client.getBooleanValue('boolean-flag', false)).toBe(
                    true
                );
                expect(firstHook.finally).toHaveBeenCalledTimes(1);
                expect(secondHook.finally).toHaveBeenCalledTimes(1);
                client.clearHooks();
                await expect(tracking.shutdown()).resolves.toBeUndefined();
                expect(shutdown).toHaveBeenCalledTimes(1);
            });

            it('supports empty composition', async () => {
                const tracking = composeDatadogTrackingHooks();
                expect(tracking.hooks).toEqual([]);
                await expect(tracking.initialize()).resolves.toBeUndefined();
                await expect(tracking.shutdown()).resolves.toBeUndefined();
            });

            it.each(['initialize', 'shutdown'] as const)(
                'isolates synchronous throws and promise rejections during %s',
                async phase => {
                    const throws = jest.fn(() => {
                        throw new Error('synchronous lifecycle failure');
                    });
                    const rejects = jest.fn(() =>
                        Promise.reject(
                            new Error('asynchronous lifecycle failure')
                        )
                    );
                    const succeeds = jest.fn(() => Promise.resolve());
                    const tracking = composeDatadogTrackingHooks(
                        { hooks: [], [phase]: throws },
                        { hooks: [], [phase]: rejects },
                        { hooks: [] },
                        { hooks: [], [phase]: succeeds }
                    );

                    await expect(tracking[phase]()).resolves.toBeUndefined();
                    expect(throws).toHaveBeenCalledTimes(1);
                    expect(rejects).toHaveBeenCalledTimes(1);
                    expect(succeeds).toHaveBeenCalledTimes(1);
                }
            );

            it.each(['initialize', 'shutdown'] as const)(
                'waits for asynchronous %s methods to settle',
                async phase => {
                    let finish = () => {};
                    const pending = new Promise<void>(resolve => {
                        finish = resolve;
                    });
                    const tracking = composeDatadogTrackingHooks({
                        hooks: [],
                        [phase]: () => pending
                    });
                    let completed = false;
                    const lifecycle = tracking[phase]().then(() => {
                        completed = true;
                    });

                    await Promise.resolve();
                    expect(completed).toBe(false);
                    finish();
                    await lifecycle;
                    expect(completed).toBe(true);
                }
            );
        });
    }
);
