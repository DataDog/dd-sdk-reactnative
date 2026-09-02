/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { UserInfoSingleton } from '../../sdk/UserInfoSingleton/UserInfoSingleton';
import { enrichEvaluationContextWithRumUser } from '../rumIntegration';

describe('enrichEvaluationContextWithRumUser', () => {
    beforeEach(() => {
        UserInfoSingleton.reset();
    });

    it('normalizes the application context when no RUM user is available', () => {
        const context = {
            targetingKey: 'explicit-user',
            email: undefined
        };

        expect(enrichEvaluationContextWithRumUser(context)).toStrictEqual({
            targetingKey: 'explicit-user'
        });
        expect(context).toStrictEqual({
            targetingKey: 'explicit-user',
            email: undefined
        });
    });

    it('adds flat primitive RUM user properties and lets explicit context win', () => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            name: 'RUM Name',
            email: 'rum@example.com',
            extraInfo: {
                company_name: 'Example, Inc.',
                age: 42,
                active: true,
                nullable: null,
                profile: { plan: 'enterprise' },
                roles: ['admin']
            }
        });

        expect(
            enrichEvaluationContextWithRumUser({
                targetingKey: 'explicit-user',
                email: 'explicit@example.com',
                request_attribute: 'request-value'
            })
        ).toEqual({
            targetingKey: 'explicit-user',
            name: 'RUM Name',
            email: 'explicit@example.com',
            company_name: 'Example, Inc.',
            age: 42,
            active: true,
            request_attribute: 'request-value'
        });
    });

    it('preserves an explicitly empty targeting key', () => {
        UserInfoSingleton.getInstance().setUserInfo({ id: 'rum-user' });

        expect(
            enrichEvaluationContextWithRumUser({ targetingKey: '' })
        ).toEqual({ targetingKey: '' });
    });

    it('uses explicitly undefined fields to remove RUM defaults', () => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            email: 'rum@example.com',
            extraInfo: { plan: 'pro' }
        });

        expect(
            enrichEvaluationContextWithRumUser({
                targetingKey: undefined,
                email: undefined,
                plan: undefined,
                request_attribute: 'request-value'
            })
        ).toStrictEqual({ request_attribute: 'request-value' });
    });

    it('uses the latest RUM user each time it is called', () => {
        UserInfoSingleton.getInstance().setUserInfo({ id: 'rum-user-a' });
        expect(enrichEvaluationContextWithRumUser({})).toEqual({
            targetingKey: 'rum-user-a'
        });

        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user-b',
            extraInfo: { plan: 'pro' }
        });
        expect(enrichEvaluationContextWithRumUser({})).toEqual({
            targetingKey: 'rum-user-b',
            plan: 'pro'
        });
    });

    it('uses application context when RUM user properties cannot be read', () => {
        const extraInfo = Object.defineProperty({}, 'broken', {
            enumerable: true,
            get: () => {
                throw new Error('cannot read user property');
            }
        });
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            extraInfo
        });
        const context = { targetingKey: 'explicit-user' };

        expect(enrichEvaluationContextWithRumUser(context)).toStrictEqual(
            context
        );
    });
});
