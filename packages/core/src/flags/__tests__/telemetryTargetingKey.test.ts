/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { FlagsClient } from '../FlagsClient';
import { configurationFromString } from '../configuration';
import type { EvaluationContext } from '../types';

const flag = {
    key: 'flag',
    value: true,
    allocationKey: 'allocation',
    variationKey: 'on',
    variationType: 'boolean',
    variationValue: 'true',
    reason: 'STATIC',
    doLog: true,
    extraLogging: {}
};
const native = NativeModules.DdFlags;
const replay = () => native.trackEvaluationWithTelemetryTargetingKey.mock.calls;
const wire = (context?: Record<string, unknown>) =>
    configurationFromString(
        JSON.stringify({
            version: 1,
            precomputed: {
                context,
                response: JSON.stringify({
                    data: {
                        attributes: {
                            flags: {
                                flag: { ...flag, variationValue: true }
                            }
                        }
                    }
                })
            }
        })
    );

jest.mock('../../InternalLog', () => ({ InternalLog: { log: jest.fn() } }));

describe('telemetry targeting key bridge', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        native.setEvaluationContext.mockResolvedValue({ flag });
    });

    it.each([
        ['missing', undefined, '', null],
        ['null', null, '', null],
        ['non-string', 12, '', null],
        ['empty', '', '', ''],
        ['ordinary', 'subject', 'subject', 'subject'],
        ['supplementary', '😀', '😀', '😀'],
        ['literal replacement', '\uFFFD', '\uFFFD', '\uFFFD'],
        ['decomposed', 'e\u0301', 'e\u0301', 'e\u0301'],
        ['lone high', '\uD800', '\uD800', null],
        ['lone low', '\uDC00', '\uDC00', null],
        ['broken pair', '\uD800x', '\uD800x', null]
    ])(
        'preserves assignment context and telemetry identity for %s',
        async (_name, input, subject, telemetry) => {
            const client = new FlagsClient('test');
            await client.setEvaluationContext({
                targetingKey: input,
                attributes: { tier: 'pro' }
            } as EvaluationContext);
            expect(client.getBooleanValue('flag', false)).toBe(true);
            expect(native.setEvaluationContext).toHaveBeenCalledWith(
                'test',
                subject,
                { tier: 'pro' }
            );
            expect(replay()).toEqual([
                ['test', 'flag', flag, subject, { tier: 'pro' }, telemetry]
            ]);
            expect(native.trackEvaluation).not.toHaveBeenCalled();
        }
    );

    it('retains the accepted key when refresh fails and replaces it on success', async () => {
        const client = new FlagsClient('test');
        await client.setEvaluationContext({ targetingKey: '' });
        native.setEvaluationContext.mockRejectedValueOnce(new Error('offline'));
        await expect(
            client.setEvaluationContext({} as EvaluationContext)
        ).rejects.toThrow('offline');
        client.getBooleanValue('flag', false);
        await client.setEvaluationContext({} as EvaluationContext);
        client.getBooleanValue('flag', false);
        expect(replay().map((call: unknown[]) => call[5])).toEqual(['', null]);
    });

    it.each([
        [undefined, null],
        [{}, null],
        [{ targetingKey: '' }, ''],
        [{ targetingKey: 'subject' }, 'subject']
    ])(
        'retains the embedded configuration subject presence: %j',
        (context, expected) => {
            const client = new FlagsClient('test');
            expect(
                client.setConfiguration(
                    wire(context as Record<string, unknown> | undefined)
                )
            ).toEqual({ status: 'ready' });
            expect(client.getBooleanValue('flag', false)).toBe(true);
            expect(replay()[0][5]).toBe(expected);
        }
    );

    it('restores embedded presence after an explicit empty override is cleared', () => {
        const client = new FlagsClient('test');
        client.setConfiguration(wire({}));
        client.getBooleanValue('flag', false);
        client.setEvaluationContextWithoutFetching({ targetingKey: '' });
        client.getBooleanValue('flag', false);
        client.resetEvaluationContextWithoutFetching();
        client.getBooleanValue('flag', false);
        expect(replay().map((call: unknown[]) => call[5])).toEqual([
            null,
            '',
            null
        ]);
    });

    it.each([false, true])(
        'uses captured offline evaluator presence %s',
        hasTargetingKey => {
            const client = new FlagsClient('test');
            client.__ddSetOfflineEvaluator(() => ({
                reconcile: () => ({ status: 'ready' }),
                evaluate: <T>(key: string, defaultValue: T) => ({
                    details: { key, value: defaultValue, reason: 'DEFAULT' },
                    exposure: {
                        flag,
                        context: { targetingKey: '' },
                        hasTargetingKey
                    }
                })
            }));
            client.getBooleanValue('flag', false);
            expect(replay()[0][5]).toBe(hasTargetingKey ? '' : null);
        }
    );
});
