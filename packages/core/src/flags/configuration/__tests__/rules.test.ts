/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://github.com/DataDog).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    flaggingCoreRulesEngine,
    getNoopRulesLogger,
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
        expect(toRulesEvaluationContext({} as never)).toHaveProperty(
            'targetingKey',
            undefined
        );
        expect(toRulesEvaluationContext({ targetingKey: '' })).toHaveProperty(
            'targetingKey',
            ''
        );
    });

    it('preserves explicit own attributes with inherited names', () => {
        const attributes = Object.create(null) as Record<string, string>;
        attributes.constructor = 'constructor-value';
        Object.defineProperty(attributes, '__proto__', {
            enumerable: true,
            value: 'prototype-value'
        });

        const context = toRulesEvaluationContext({
            targetingKey: 'user-1',
            attributes
        });

        expect(
            Object.prototype.hasOwnProperty.call(context, 'constructor')
        ).toBe(true);
        expect(context.constructor).toBe('constructor-value');
        expect(Object.prototype.hasOwnProperty.call(context, '__proto__')).toBe(
            true
        );
        expect(Reflect.get(context, '__proto__')).toBe('prototype-value');
    });

    it('normalizes a real flagging-core protobuf evaluation', () => {
        const result = flaggingCoreRulesEngine.evaluate({
            configuration: buildRulesConfiguration(),
            type: 'boolean',
            flagKey: 'browser-flag',
            defaultValue: false,
            context: { targetingKey: 'user-1' },
            logger: getNoopRulesLogger()
        });

        expect(result).toMatchObject({
            value: true,
            variant: 'on',
            reason: 'STATIC',
            metadata: {
                allocationKey: 'allocation',
                variationType: 'boolean',
                doLog: false
            }
        });
    });

    it('preserves a deterministic flag-scoped PARSE_ERROR', () => {
        const configuration = buildRulesConfiguration();
        configuration.flags['browser-flag'].minimumFeatureLevel = 1;

        expect(
            flaggingCoreRulesEngine.evaluate({
                configuration,
                type: 'boolean',
                flagKey: 'browser-flag',
                defaultValue: false,
                context: { targetingKey: 'user-1' },
                logger: getNoopRulesLogger()
            })
        ).toMatchObject({
            value: false,
            reason: 'ERROR',
            errorCode: 'PARSE_ERROR',
            errorMessage: 'Flag requires an unsupported feature level'
        });
    });

    it.each(['toString', 'constructor', '__proto__'])(
        'returns FLAG_NOT_FOUND for an absent reserved-name flag %s',
        flagKey => {
            expect(
                flaggingCoreRulesEngine.evaluate({
                    configuration: buildRulesConfiguration(),
                    type: 'boolean',
                    flagKey,
                    defaultValue: false,
                    context: { targetingKey: 'user-1' },
                    logger: getNoopRulesLogger()
                })
            ).toEqual({
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
                flagKey: 'browser-flag',
                defaultValue: false,
                context: { targetingKey: 'user-1' },
                logger: getNoopRulesLogger()
            })
        ).toMatchObject({ value: true, variant: 'fake' });
    });
});
