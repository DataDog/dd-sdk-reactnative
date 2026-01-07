/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { AccountInfoSingleton } from '../AccountInfoSingleton';

describe('AccountInfoSingleton', () => {
    beforeEach(() => {
        AccountInfoSingleton.reset();
    });

    it('returns undefined by default', () => {
        expect(
            AccountInfoSingleton.getInstance().getAccountInfo()
        ).toBeUndefined();
    });

    it('stores and returns account info after `setAccountInfo`', () => {
        const info = {
            id: 'test',
            name: 'test user',
            extraInfo: { premium: true }
        };

        AccountInfoSingleton.getInstance().setAccountInfo(info);

        expect(AccountInfoSingleton.getInstance().getAccountInfo()).toEqual(
            info
        );
    });

    it('adds extra account info with `addAccountExtraInfo`', () => {
        const info = {
            id: 'test',
            name: 'test user',
            extraInfo: { premium: true }
        };

        AccountInfoSingleton.getInstance().setAccountInfo(info);
        AccountInfoSingleton.getInstance().addAccountExtraInfo({
            testGroup: 'A'
        });

        expect(AccountInfoSingleton.getInstance().getAccountInfo()).toEqual({
            ...info,
            extraInfo: { ...info.extraInfo, testGroup: 'A' }
        });
    });

    it('clears account info with `clearAccountInfo`', () => {
        AccountInfoSingleton.getInstance().setAccountInfo({
            id: 'test',
            name: 'test user',
            extraInfo: { premium: true }
        });

        AccountInfoSingleton.getInstance().clearAccountInfo();

        expect(
            AccountInfoSingleton.getInstance().getAccountInfo()
        ).toBeUndefined();
    });

    it('`reset()` replaces the provider and clears stored account info', () => {
        const instanceBefore = AccountInfoSingleton.getInstance();

        AccountInfoSingleton.getInstance().setAccountInfo({
            id: 'test',
            name: 'test user',
            extraInfo: { premium: true }
        });

        AccountInfoSingleton.reset();

        const instanceAfter = AccountInfoSingleton.getInstance();

        expect(instanceAfter).not.toBe(instanceBefore);

        expect(instanceAfter.getAccountInfo()).toBeUndefined();
    });

    it('getInstance returns the same provider between calls (singleton behavior)', () => {
        const a = AccountInfoSingleton.getInstance();
        const b = AccountInfoSingleton.getInstance();

        expect(a).toBe(b);
    });
});
