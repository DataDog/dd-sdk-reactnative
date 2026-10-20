/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum } from '@datadog/mobile-react-native';
import { ErrorCode, OpenFeature } from '@openfeature/web-sdk';

import NativeDdFlags from '../../../core/src/specs/NativeDdFlags';
import type { DatadogTrackingHook, DatadogTrackingHooks } from '../index';
import { DatadogCoreProvider } from '../rules-based';
import {
    composeDatadogTrackingHooks,
    createDatadogEvaluationLoggingHook,
    createDatadogExposureLoggingHook,
    createDatadogRumTrackingHook
} from '../tracking';

import {
    matchingContext,
    precomputedConfiguration,
    rulesConfiguration
} from './__utils__/coreConfiguration';

// Exercise the real evaluator, OpenFeature lifecycle, and JS bridge adapter. Only native
// delivery is mocked; its promises deliberately never resolve to detect accidental awaiting.
jest.mock('../../../core/src/specs/NativeDdFlags', () => ({
    __esModule: true,
    default: {
        enable: jest.fn(),
        setEvaluationContext: jest.fn(),
        trackEvaluation: jest.fn(),
        trackExposure: jest.fn(() => new Promise(() => {})),
        trackEvaluationEvent: jest.fn(() => new Promise(() => {}))
    }
}));

if (!NativeDdFlags) {
    throw new Error('Native flags test double is required');
}
const native = jest.mocked(NativeDdFlags);
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

describe('optional native tracking hooks', () => {
    let rum: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        rum = jest
            .spyOn(DdRum, 'addFeatureFlagEvaluation')
            .mockImplementation(() => new Promise(() => {}));
    });

    afterEach(async () => {
        await OpenFeature.clearProviders();
        await OpenFeature.clearContext();
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it('does not track when no hooks are registered', async () => {
        const { client } = await configuredClient();
        expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
        expect(native.trackExposure).not.toHaveBeenCalled();
        expect(native.trackEvaluationEvent).not.toHaveBeenCalled();
        expect(native.trackEvaluation).not.toHaveBeenCalled();
        expect(rum).not.toHaveBeenCalled();
    });

    it.each([
        ['exposure', createDatadogExposureLoggingHook, 1, 0, 0],
        ['evaluation', createDatadogEvaluationLoggingHook, 0, 1, 0],
        ['RUM', createDatadogRumTrackingHook, 0, 0, 1]
    ] as const)(
        'selects only the %s operation',
        async (_name, create, exposures, evaluations, rumCalls) => {
            const { client } = await configuredClient(create());
            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
            expect(native.trackExposure).toHaveBeenCalledTimes(exposures);
            expect(native.trackEvaluationEvent).toHaveBeenCalledTimes(
                evaluations
            );
            expect(rum).toHaveBeenCalledTimes(rumCalls);
            expect(native.trackEvaluation).not.toHaveBeenCalled();
            expect(native.enable).not.toHaveBeenCalled();
            expect(native.setEvaluationContext).not.toHaveBeenCalled();
        }
    );

    it('submits each record immediately, without JS batching or deduplication', async () => {
        const tracking = composeDatadogTrackingHooks(
            createDatadogExposureLoggingHook({ clientName: 'native-owner' }),
            createDatadogEvaluationLoggingHook({ clientName: 'native-owner' }),
            createDatadogRumTrackingHook()
        );
        const { client } = await configuredClient(tracking);
        jest.useFakeTimers();
        for (let i = 0; i < 10; i++) {
            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
            expect(native.trackExposure).toHaveBeenCalledTimes(i + 1);
            expect(native.trackEvaluationEvent).toHaveBeenCalledTimes(i + 1);
            expect(rum).toHaveBeenCalledTimes(i + 1);
        }
        expect(jest.getTimerCount()).toBe(0);
        expect(native.trackEvaluation).not.toHaveBeenCalled();
        expect(native.trackExposure).toHaveBeenLastCalledWith(
            'native-owner',
            'boolean-flag',
            expect.objectContaining({
                value: true,
                allocationKey: 'allocation',
                variationKey: 'on',
                doLog: true,
                variationType: 'boolean',
                variationValue: 'true'
            }),
            'user-1',
            { country: 'US' }
        );
        expect(rum).toHaveBeenLastCalledWith('boolean-flag', 'on');
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
        expect(native.trackEvaluationEvent).toHaveBeenCalledWith(
            'default',
            'string-flag',
            expect.objectContaining({ doLog: false, variationKey: 'greeting' }),
            'user-1',
            { country: 'US' },
            null
        );
        expect(rum).toHaveBeenCalledWith('string-flag', 'greeting');
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
        expect(native.trackEvaluationEvent.mock.calls).toEqual([
            [
                'default',
                'missing',
                null,
                'user-1',
                { country: 'US' },
                ErrorCode.FLAG_NOT_FOUND
            ],
            [
                'default',
                'boolean-flag',
                null,
                'user-1',
                { country: 'US' },
                ErrorCode.TYPE_MISMATCH
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
            native.trackEvaluationEvent.mock.calls.map(call => call.slice(3, 5))
        ).toEqual([
            ['user-1', { country: 'US' }],
            ['user-2', { country: 'CA' }]
        ]);
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
        expect(native.trackEvaluationEvent).toHaveBeenCalledTimes(3);
        expect(native.enable).not.toHaveBeenCalled();
    });

    it('isolates synchronous bridge errors and rejected native promises from evaluation', async () => {
        native.trackExposure.mockImplementationOnce(() => {
            throw new Error('bridge unavailable');
        });
        native.trackEvaluationEvent.mockRejectedValueOnce(
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
        expect(native.trackEvaluationEvent).toHaveBeenCalledTimes(1);
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
        expect(native.trackEvaluationEvent).toHaveBeenCalledTimes(1);
        expect(rum).toHaveBeenCalledTimes(1);
        expect(native.enable).not.toHaveBeenCalled();
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
            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
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
                    Promise.reject(new Error('asynchronous lifecycle failure'))
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
});
