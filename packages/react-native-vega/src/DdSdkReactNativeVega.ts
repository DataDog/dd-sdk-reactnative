/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    AttributesSingleton,
    UserInfoSingleton,
    AccountInfoSingleton
} from '@datadog/mobile-react-native/internal';
import type { Attributes } from '@datadog/mobile-react-native/internal';

import { VegaSdk } from './SdkInitialization';
import { callNative } from './callNative';
import { getNativeDdSdk } from './turbo-modules/NativeDdSdk';

type UserInfo = {
    id: string;
    name?: string;
    email?: string;
    extraInfo?: Record<string, unknown>;
};
type AccountInfo = Omit<UserInfo, 'email'>;

/** Global attributes and context, alongside the shared initialization APIs. */
export class DdSdkReactNative extends VegaSdk {
    static addAttribute = async (
        key: string,
        value: unknown
    ): Promise<void> => {
        if (
            await callNative(getNativeDdSdk, native =>
                native.addAttribute(key, { value })
            )
        ) {
            AttributesSingleton.getInstance().addAttribute(key, value);
        }
    };

    static removeAttribute = async (key: string): Promise<void> => {
        if (
            await callNative(getNativeDdSdk, native =>
                native.removeAttribute(key)
            )
        ) {
            AttributesSingleton.getInstance().removeAttribute(key);
        }
    };

    static addAttributes = async (attributes: Attributes): Promise<void> => {
        if (
            await callNative(getNativeDdSdk, native =>
                native.addAttributes(attributes)
            )
        ) {
            AttributesSingleton.getInstance().addAttributes(attributes);
        }
    };

    static removeAttributes = async (keys: string[]): Promise<void> => {
        if (
            await callNative(getNativeDdSdk, native =>
                native.removeAttributes(keys)
            )
        ) {
            AttributesSingleton.getInstance().removeAttributes(keys);
        }
    };
    static setUserInfo = async (info: UserInfo): Promise<void> => {
        if (typeof info?.id !== 'string' || !info.id) {
            return;
        }
        if (
            await callNative(getNativeDdSdk, native => native.setUserInfo(info))
        ) {
            UserInfoSingleton.getInstance().setUserInfo({ ...info });
        }
    };
    static clearUserInfo = async (): Promise<void> => {
        if (
            await callNative(getNativeDdSdk, native => native.clearUserInfo())
        ) {
            UserInfoSingleton.getInstance().clearUserInfo();
        }
    };
    static addUserExtraInfo = async (
        info: Record<string, unknown>
    ): Promise<void> => {
        if (!UserInfoSingleton.getInstance().getUserInfo()) {
            return;
        }
        if (
            await callNative(getNativeDdSdk, native =>
                native.addUserExtraInfo(info)
            )
        ) {
            UserInfoSingleton.getInstance().addUserExtraInfo(info);
        }
    };
    static setAccountInfo = async (info: AccountInfo): Promise<void> => {
        if (typeof info?.id !== 'string' || !info.id) {
            return;
        }
        if (
            await callNative(getNativeDdSdk, native =>
                native.setAccountInfo(info)
            )
        ) {
            AccountInfoSingleton.getInstance().setAccountInfo({ ...info });
        }
    };
    static clearAccountInfo = async (): Promise<void> => {
        if (
            await callNative(getNativeDdSdk, native =>
                native.clearAccountInfo()
            )
        ) {
            AccountInfoSingleton.getInstance().clearAccountInfo();
        }
    };
    static addAccountExtraInfo = async (
        info: Record<string, unknown>
    ): Promise<void> => {
        if (!AccountInfoSingleton.getInstance().getAccountInfo()) {
            return;
        }
        if (
            await callNative(getNativeDdSdk, native =>
                native.addAccountExtraInfo(info)
            )
        ) {
            AccountInfoSingleton.getInstance().addAccountExtraInfo(info);
        }
    };
}
