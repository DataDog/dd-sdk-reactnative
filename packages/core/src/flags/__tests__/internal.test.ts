/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../config/types/SdkVerbosity';
import { processEvaluationContext } from '../internal';

jest.mock('../../InternalLog', () => {
    return {
        InternalLog: { log: jest.fn() },
        DATADOG_MESSAGE_PREFIX: 'DATADOG:'
    };
});

describe('processEvaluationContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it.each(['user-1', ''])(
        'preserves the string targeting key %p without a warning',
        targetingKey => {
            expect(processEvaluationContext({ targetingKey })).toStrictEqual({
                targetingKey,
                attributes: {}
            });
            expect(InternalLog.log).not.toHaveBeenCalled();
        }
    );

    it.each([42, true, false, null, undefined, {}, []])(
        'uses the anonymous subject for a non-string final targeting key %p',
        targetingKey => {
            // JavaScript callers can provide values outside the TypeScript contract.
            const context = {
                targetingKey: targetingKey as never,
                attributes: { plan: 'pro' }
            };

            expect(processEvaluationContext(context)).toStrictEqual({
                targetingKey: '',
                attributes: { plan: 'pro' }
            });
            expect(context.targetingKey).toBe(targetingKey);
            expect(InternalLog.log).toHaveBeenCalledTimes(1);
            expect(InternalLog.log).toHaveBeenCalledWith(
                "The evaluation context targetingKey is not a string. Using the anonymous subject ('') instead.",
                SdkVerbosity.WARN
            );
        }
    );

    it('keeps primitive attributes and drops non-primitive ones', () => {
        expect(
            processEvaluationContext({
                targetingKey: 'user-1',
                attributes: {
                    country: 'US',
                    age: 25,
                    beta: true,
                    // Dropped: non-primitive.
                    nested: { a: 1 } as never
                }
            })
        ).toEqual({
            targetingKey: 'user-1',
            attributes: { country: 'US', age: 25, beta: true }
        });
    });

    it('does not null the prototype for a "__proto__": null attribute', () => {
        const result = processEvaluationContext({
            targetingKey: 'user-1',
            attributes: { ['__proto__']: null }
        });

        // A plain `attributes[key] = value` would have set the object's prototype to
        // null here; the Map + Object.fromEntries build keeps it a normal object.
        expect(Object.getPrototypeOf(result.attributes)).toBe(Object.prototype);
    });
});
