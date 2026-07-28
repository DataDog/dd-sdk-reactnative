/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://github.com/DataDog).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    flaggingCoreRulesEngine,
    getNoopRulesLogger,
    prepareRulesConfiguration,
    toRulesEvaluationContext
} from '../rules';

import {
    buildRulesConfiguration,
    createFakeRulesEngine
} from './__utils__/rulesTestUtils';

describe('rules configuration', () => {
    it('converts an SDK context to a flat rules context and reserves identifiers', () => {
        expect(
            toRulesEvaluationContext({
                targetingKey: 'user-1',
                attributes: {
                    country: 'US',
                    id: 'customer-id',
                    targetingKey: 'attribute-key',
                    enabled: true
                }
            })
        ).toEqual({
            targetingKey: 'user-1',
            country: 'US',
            enabled: true
        });
    });

    it('preserves the difference between a missing and empty targeting key', () => {
        expect(toRulesEvaluationContext({})).toHaveProperty(
            'targetingKey',
            undefined
        );
        expect(toRulesEvaluationContext({ targetingKey: '' })).toHaveProperty(
            'targetingKey',
            ''
        );
    });

    it('clones and freezes a valid rules configuration', () => {
        const source = buildRulesConfiguration();
        const prepared = prepareRulesConfiguration(source);

        expect(prepared.status).toBe('ready');
        if (prepared.status !== 'ready') {
            throw new Error(prepared.errorMessage);
        }

        source.flags['dynamic-flag'].enabled = false;

        expect(prepared.configuration.flags['dynamic-flag'].enabled).toBe(true);
        expect(Object.isFrozen(prepared.configuration)).toBe(true);
        expect(
            Object.isFrozen(
                prepared.configuration.flags['dynamic-flag'].allocations[0]
            )
        ).toBe(true);
    });

    it('omits a flag that uses an unsupported operator', () => {
        const source = buildRulesConfiguration();
        const condition =
            source.flags['dynamic-flag'].allocations[0].rules?.[0]
                .conditions[0];

        if (!condition) {
            throw new Error('The fixture has no condition.');
        }
        (condition as { operator: string }).operator = 'FUTURE_OPERATOR';

        const prepared = prepareRulesConfiguration(source);

        expect(prepared.status).toBe('ready');
        if (prepared.status !== 'ready') {
            throw new Error(prepared.errorMessage);
        }
        expect(prepared.configuration.flags).toEqual({});
    });

    it('omits a flag that contains an invalid regular expression', () => {
        const source = buildRulesConfiguration();
        const conditions =
            source.flags['dynamic-flag'].allocations[0].rules?.[0].conditions;
        if (!conditions) {
            throw new Error('The fixture has no conditions.');
        }
        conditions[0] = {
            operator: 'MATCHES',
            attribute: 'country',
            value: '['
        } as typeof conditions[number];

        const prepared = prepareRulesConfiguration(source);

        expect(prepared.status).toBe('ready');
        if (prepared.status !== 'ready') {
            throw new Error(prepared.errorMessage);
        }
        expect(prepared.configuration.flags).toEqual({});
    });

    it('omits a flag whose split points to an absent variation', () => {
        const source = buildRulesConfiguration();
        source.flags['dynamic-flag'].allocations[0].splits[0].variationKey =
            'absent';

        const prepared = prepareRulesConfiguration(source);

        expect(prepared.status).toBe('ready');
        if (prepared.status !== 'ready') {
            throw new Error(prepared.errorMessage);
        }
        expect(prepared.configuration.flags).toEqual({});
    });

    it('keeps valid flags when it omits an invalid flag', () => {
        const source = buildRulesConfiguration();
        const validFlag = buildRulesConfiguration().flags['dynamic-flag'];
        validFlag.key = 'valid-flag';
        source.flags['valid-flag'] = validFlag;

        const condition =
            source.flags['dynamic-flag'].allocations[0].rules?.[0]
                .conditions[0];
        if (!condition) {
            throw new Error('The fixture has no condition.');
        }
        (condition as { operator: string }).operator = 'FUTURE_OPERATOR';

        const prepared = prepareRulesConfiguration(source);

        expect(prepared.status).toBe('ready');
        if (prepared.status !== 'ready') {
            throw new Error(prepared.errorMessage);
        }
        expect(Object.keys(prepared.configuration.flags)).toEqual([
            'valid-flag'
        ]);
    });

    it('normalizes a real flagging-core evaluation', () => {
        const configuration = buildRulesConfiguration();

        const result = flaggingCoreRulesEngine.evaluate({
            configuration,
            type: 'boolean',
            flagKey: 'dynamic-flag',
            defaultValue: false,
            context: {
                targetingKey: 'user-1',
                country: 'US'
            },
            logger: getNoopRulesLogger()
        });

        expect(result).toMatchObject({
            value: true,
            variant: 'enabled',
            reason: 'TARGETING_MATCH',
            metadata: {
                allocationKey: 'allocation-1',
                variationType: 'boolean',
                doLog: false
            }
        });
    });

    it.each([
        ['INTEGER', 42],
        ['NUMERIC', 1.5]
    ] as const)(
        'normalizes %s variation metadata to number',
        (variationType, variationValue) => {
            const configuration = buildRulesConfiguration();
            const flag = configuration.flags['dynamic-flag'];
            flag.variationType = variationType;
            flag.variations.enabled.value = variationValue;
            flag.variations.disabled.value = 0;

            const result = flaggingCoreRulesEngine.evaluate({
                configuration,
                type: 'number',
                flagKey: 'dynamic-flag',
                defaultValue: 0,
                context: {
                    targetingKey: 'user-1',
                    country: 'US'
                },
                logger: getNoopRulesLogger()
            });

            expect(result).toMatchObject({
                value: variationValue,
                metadata: {
                    variationType: 'number'
                }
            });
        }
    );

    it.each(['toString', 'constructor', '__proto__'])(
        'checks own properties before it evaluates %s',
        flagKey => {
            const result = flaggingCoreRulesEngine.evaluate({
                configuration: buildRulesConfiguration(),
                type: 'boolean',
                flagKey,
                defaultValue: false,
                context: { targetingKey: 'user-1' },
                logger: getNoopRulesLogger()
            });

            expect(result).toEqual({
                value: false,
                reason: 'ERROR',
                errorCode: 'FLAG_NOT_FOUND',
                metadata: {}
            });
        }
    );

    it('provides a deterministic fake engine for client tests', () => {
        const fake = createFakeRulesEngine({
            value: true,
            variant: 'fake',
            reason: 'TARGETING_MATCH',
            metadata: {}
        });

        expect(
            fake.evaluate({
                configuration: buildRulesConfiguration(),
                type: 'boolean',
                flagKey: 'dynamic-flag',
                defaultValue: false,
                context: { targetingKey: 'user-1' },
                logger: getNoopRulesLogger()
            })
        ).toMatchObject({ value: true, variant: 'fake' });
    });
});
