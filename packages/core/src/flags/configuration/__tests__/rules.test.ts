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

    it('rejects an unsupported operator', () => {
        const source = buildRulesConfiguration();
        const condition =
            source.flags['dynamic-flag'].allocations[0].rules?.[0]
                .conditions[0];

        if (!condition) {
            throw new Error('The fixture has no condition.');
        }
        (condition as { operator: string }).operator = 'ONE_OF_SHA256';

        expect(prepareRulesConfiguration(source)).toEqual({
            status: 'error',
            errorMessage:
                'The rules configuration uses the unsupported operator "ONE_OF_SHA256".'
        });
    });

    it('rejects an invalid regular expression', () => {
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

        expect(prepareRulesConfiguration(source)).toEqual({
            status: 'error',
            errorMessage: 'A regular expression condition is not valid.'
        });
    });

    it('rejects a split that points to an absent variation', () => {
        const source = buildRulesConfiguration();
        source.flags['dynamic-flag'].allocations[0].splits[0].variationKey =
            'absent';

        expect(prepareRulesConfiguration(source)).toEqual({
            status: 'error',
            errorMessage: 'A split has an invalid variation key.'
        });
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
                doLog: false,
                extraLogging: { experiment: 'checkout' },
                splitSerialId: 7
            }
        });
        expect(result.metadata.evaluationTimestampMs).toEqual(
            expect.any(Number)
        );
    });

    it('checks own properties before it calls flagging-core', () => {
        const result = flaggingCoreRulesEngine.evaluate({
            configuration: buildRulesConfiguration(),
            type: 'boolean',
            flagKey: 'toString',
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
    });

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
