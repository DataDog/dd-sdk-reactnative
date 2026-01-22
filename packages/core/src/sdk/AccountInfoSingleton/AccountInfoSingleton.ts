/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { setCachedAccountId } from '../../rum/helper';

import type { AccountInfo } from './types';

class AccountInfoProvider {
    private accountInfo: AccountInfo | undefined = undefined;

    setAccountInfo = (accountInfo: AccountInfo) => {
        this.accountInfo = accountInfo;
        setCachedAccountId(this.accountInfo.id);
    };

    addAccountExtraInfo = (extraInfo: AccountInfo['extraInfo']) => {
        if (!this.accountInfo) {
            return;
        }

        this.accountInfo.extraInfo = {
            ...this.accountInfo.extraInfo,
            ...extraInfo
        };
    };

    getAccountInfo = (): AccountInfo | undefined => {
        return this.accountInfo;
    };

    clearAccountInfo = () => {
        this.accountInfo = undefined;
    };
}

export class AccountInfoSingleton {
    private static accountInfoProvider = new AccountInfoProvider();

    static getInstance = (): AccountInfoProvider => {
        return AccountInfoSingleton.accountInfoProvider;
    };

    static reset = () => {
        AccountInfoSingleton.accountInfoProvider = new AccountInfoProvider();
    };
}
