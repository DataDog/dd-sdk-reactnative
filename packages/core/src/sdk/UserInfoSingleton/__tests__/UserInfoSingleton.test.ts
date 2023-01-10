/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { UserInfoSingleton } from '../UserInfoSingleton';

describe('UserInfoSingleton', () => {
    it('sets, returns and resets the user info', () => {
        UserInfoSingleton.getInstance().setUserInfo({
            email: 'user@mail.com',
            extraInfo: {
                loggedIn: true
            }
        });

        expect(UserInfoSingleton.getInstance().getUserInfo()).toEqual({
            email: 'user@mail.com',
            extraInfo: {
                loggedIn: true
            }
        });

        UserInfoSingleton.reset();

        expect(UserInfoSingleton.getInstance().getUserInfo()).toEqual({});
    });
});
