/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { UserInfoSingleton } from '../UserInfoSingleton';

describe('UserInfoSingleton', () => {
    beforeEach(() => {
        UserInfoSingleton.reset();
    });

    it('returns undefined by default', () => {
        expect(UserInfoSingleton.getInstance().getUserInfo()).toBeUndefined();
    });

    it('stores and returns user info after setUserInfo', () => {
        const info = {
            id: 'test',
            email: 'user@mail.com',
            extraInfo: { loggedIn: true }
        };

        UserInfoSingleton.getInstance().setUserInfo(info);

        expect(UserInfoSingleton.getInstance().getUserInfo()).toEqual(info);
    });

    it('clears user info with clearUserInfo', () => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'test',
            email: 'user@mail.com',
            extraInfo: { loggedIn: true }
        });

        UserInfoSingleton.getInstance().clearUserInfo();

        expect(UserInfoSingleton.getInstance().getUserInfo()).toBeUndefined();
    });

    it('reset() replaces the provider and clears stored user info', () => {
        const instanceBefore = UserInfoSingleton.getInstance();

        UserInfoSingleton.getInstance().setUserInfo({
            id: 'test',
            email: 'user@mail.com',
            extraInfo: { loggedIn: true }
        });

        UserInfoSingleton.reset();

        const instanceAfter = UserInfoSingleton.getInstance();

        expect(instanceAfter).not.toBe(instanceBefore);

        expect(instanceAfter.getUserInfo()).toBeUndefined();
    });

    it('getInstance returns the same provider between calls (singleton behavior)', () => {
        const a = UserInfoSingleton.getInstance();
        const b = UserInfoSingleton.getInstance();

        expect(a).toBe(b);
    });
});
