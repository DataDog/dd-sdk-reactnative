/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { processEvaluationContext } from '../internal';

jest.mock('../../InternalLog', () => {
    return {
        InternalLog: { log: jest.fn() },
        DATADOG_MESSAGE_PREFIX: 'DATADOG:'
    };
});

describe('processEvaluationContext', () => {
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
