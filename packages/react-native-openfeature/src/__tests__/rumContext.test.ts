/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { UserInfoSingleton } from '../../../core/src/sdk/UserInfoSingleton/UserInfoSingleton';
import { enrichRumContext } from '../rumContext';

describe('enrichRumContext', () => {
    beforeEach(() => {
        UserInfoSingleton.reset();
    });

    it('explicitly adds the current RUM user to application context', () => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            name: 'RUM Name',
            email: 'rum@example.com',
            extraInfo: {
                plan: 'pro',
                profile: { tier: 'enterprise' }
            }
        });

        expect(
            enrichRumContext({
                targetingKey: 'device-subject',
                email: 'application@example.com',
                region: 'us-east-1'
            })
        ).toStrictEqual({
            targetingKey: 'device-subject',
            name: 'RUM Name',
            email: 'application@example.com',
            plan: 'pro',
            region: 'us-east-1'
        });
    });

    it('uses undefined application fields as tombstones', () => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            email: 'rum@example.com',
            extraInfo: { plan: 'pro' }
        });

        expect(
            enrichRumContext({
                email: undefined,
                plan: undefined
            })
        ).toStrictEqual({ targetingKey: 'rum-user' });
    });

    it('normalizes undefined fields when no RUM user is available', () => {
        expect(
            enrichRumContext({
                targetingKey: 'application-subject',
                email: undefined
            })
        ).toStrictEqual({ targetingKey: 'application-subject' });
    });

    it('reads the latest RUM user without mutating the application context', () => {
        const applicationContext = { region: 'us-east-1' };

        UserInfoSingleton.getInstance().setUserInfo({ id: 'rum-user-a' });
        expect(enrichRumContext(applicationContext)).toStrictEqual({
            targetingKey: 'rum-user-a',
            region: 'us-east-1'
        });

        UserInfoSingleton.getInstance().setUserInfo({ id: 'rum-user-b' });
        expect(enrichRumContext(applicationContext)).toStrictEqual({
            targetingKey: 'rum-user-b',
            region: 'us-east-1'
        });
        expect(applicationContext).toStrictEqual({ region: 'us-east-1' });
    });
});
