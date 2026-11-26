/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    isEmptyContext,
    toDdContext,
    withoutAssignmentToken
} from '../mappers';

describe('assignment token isolation', () => {
    it('removes only the reserved credential without changing the application context', () => {
        const context = {
            targetingKey: 'subject',
            country: 'US',
            dd_assignment_token: 'synthetic-credential'
        };
        expect(withoutAssignmentToken(context)).toEqual({
            targetingKey: 'subject',
            country: 'US'
        });
        expect(context.dd_assignment_token).toBe('synthetic-credential');
        expect(toDdContext(context)).toEqual({
            targetingKey: 'subject',
            attributes: { country: 'US' }
        });
    });

    it.each([undefined, null, false, 42, 'synthetic-credential'])(
        'does not treat an authorization-only context as a targeting override: %j',
        token => {
            expect(isEmptyContext({ dd_assignment_token: token })).toBe(true);
            expect(
                withoutAssignmentToken({ dd_assignment_token: token })
            ).toEqual({});
        }
    );
});
