/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { UserInfo } from './types';

class UserInfoProvider {
    private userInfo: UserInfo = {};

    setUserInfo = (userInfo: UserInfo) => {
        this.userInfo = userInfo;
    };

    getUserInfo = (): UserInfo => {
        return this.userInfo;
    };
}

export class UserInfoSingleton {
    private static userInfoProvider = new UserInfoProvider();

    static getInstance = (): UserInfoProvider => {
        return UserInfoSingleton.userInfoProvider;
    };

    static reset = () => {
        UserInfoSingleton.userInfoProvider = new UserInfoProvider();
    };
}
