/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    AccountInfoSingleton,
    AttributesSingleton,
    UserInfoSingleton
} from '@datadog/mobile-react-native/internal';

import { DdSdkReactNative } from '../src/DdSdkReactNativeVega';

const mockNative = {
    addAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    addAttributes: jest.fn(),
    removeAttributes: jest.fn(),
    setUserInfo: jest.fn(),
    clearUserInfo: jest.fn(),
    addUserExtraInfo: jest.fn(),
    setAccountInfo: jest.fn(),
    clearAccountInfo: jest.fn(),
    addAccountExtraInfo: jest.fn()
};
const mockGet = jest.fn();
jest.mock('@amazon-devices/keplerscript-turbomodule-api', () => ({
    TurboModuleRegistry: { get: (...args: unknown[]) => mockGet(...args) }
}));

describe('Vega user and account context', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGet.mockReturnValue(mockNative);
        UserInfoSingleton.reset();
        AttributesSingleton.reset();
        AccountInfoSingleton.reset();
    });
    it('sets, merges, replaces and clears user context', async () => {
        const user = {
            id: 'user',
            name: 'name',
            email: 'user@example.com',
            extraInfo: { count: 1, keep: false }
        };
        await DdSdkReactNative.setUserInfo(user);
        expect(mockNative.setUserInfo).toHaveBeenCalledWith(user);
        expect(UserInfoSingleton.getInstance().getUserInfo()).toEqual(user);
        const extra = { count: 2, nested: { array: [null, true, 3] } };
        await DdSdkReactNative.addUserExtraInfo(extra);
        expect(mockNative.addUserExtraInfo).toHaveBeenCalledWith(extra);
        expect(
            UserInfoSingleton.getInstance().getUserInfo()?.extraInfo
        ).toEqual({ ...user.extraInfo, ...extra });
        await DdSdkReactNative.setUserInfo({ id: 'replacement' });
        expect(UserInfoSingleton.getInstance().getUserInfo()).toEqual({
            id: 'replacement'
        });
        await DdSdkReactNative.clearUserInfo();
        expect(mockNative.clearUserInfo).toHaveBeenCalledTimes(1);
        expect(UserInfoSingleton.getInstance().getUserInfo()).toBeUndefined();
    });
    it('sets, merges, replaces and clears account context', async () => {
        const account = {
            id: 'account',
            name: 'team',
            extraInfo: { plan: 'free' }
        };
        await DdSdkReactNative.setAccountInfo(account);
        expect(mockNative.setAccountInfo).toHaveBeenCalledWith(account);
        await DdSdkReactNative.addAccountExtraInfo({
            plan: 'paid',
            active: true
        });
        expect(mockNative.addAccountExtraInfo).toHaveBeenCalledWith({
            plan: 'paid',
            active: true
        });
        expect(
            AccountInfoSingleton.getInstance().getAccountInfo()?.extraInfo
        ).toEqual({ plan: 'paid', active: true });
        await DdSdkReactNative.setAccountInfo({ id: 'replacement' });
        expect(AccountInfoSingleton.getInstance().getAccountInfo()).toEqual({
            id: 'replacement'
        });
        await DdSdkReactNative.clearAccountInfo();
        expect(mockNative.clearAccountInfo).toHaveBeenCalledTimes(1);
        expect(
            AccountInfoSingleton.getInstance().getAccountInfo()
        ).toBeUndefined();
    });
    it('ignores invalid IDs and account extra info without an account', async () => {
        await DdSdkReactNative.setUserInfo({ id: '' });
        await DdSdkReactNative.setAccountInfo({ id: '' });
        await DdSdkReactNative.addAccountExtraInfo({ value: 1 });
        expect(mockGet).not.toHaveBeenCalled();
    });
    it('merges anonymous user attributes without requiring a user ID', async () => {
        await DdSdkReactNative.addUserExtraInfo({
            plan: 'free',
            enabled: false
        });
        await DdSdkReactNative.addUserExtraInfo({
            plan: 'paid',
            nested: { values: [1, null] }
        });
        expect(mockNative.addUserExtraInfo).toHaveBeenNthCalledWith(1, {
            plan: 'free',
            enabled: false
        });
        expect(mockNative.addUserExtraInfo).toHaveBeenNthCalledWith(2, {
            plan: 'paid',
            nested: { values: [1, null] }
        });
        expect(UserInfoSingleton.getInstance().getUserInfo()).toEqual({
            extraInfo: {
                plan: 'paid',
                enabled: false,
                nested: { values: [1, null] }
            }
        });
    });
    it('does not update anonymous user attributes when native rejects them', async () => {
        mockNative.addUserExtraInfo.mockResolvedValueOnce(false);
        await DdSdkReactNative.addUserExtraInfo({ plan: 'free' });
        expect(mockNative.addUserExtraInfo).toHaveBeenCalledWith({
            plan: 'free'
        });
        expect(UserInfoSingleton.getInstance().getUserInfo()).toBeUndefined();
    });
    it('does not mutate account information owned by the application', async () => {
        const account = Object.freeze({
            id: 'account',
            extraInfo: { plan: 'free' }
        });
        await DdSdkReactNative.setAccountInfo(account);
        await DdSdkReactNative.addAccountExtraInfo({ plan: 'paid' });
        expect(account.extraInfo).toEqual({ plan: 'free' });
        expect(
            AccountInfoSingleton.getInstance().getAccountInfo()?.extraInfo
        ).toEqual({ plan: 'paid' });
    });
    it('retains the identity sent to native while awaiting its response', async () => {
        let complete: (value: boolean) => void = () => undefined;
        mockNative.setUserInfo.mockReturnValueOnce(
            new Promise<boolean>(resolve => {
                complete = resolve;
            })
        );
        const user = { id: 'original' };
        const update = DdSdkReactNative.setUserInfo(user);
        user.id = 'changed';
        complete(true);
        await update;
        expect(mockNative.setUserInfo).toHaveBeenLastCalledWith({
            id: 'original'
        });
        expect(UserInfoSingleton.getInstance().getUserInfo()?.id).toBe(
            'original'
        );
    });
    it('keeps global, user and account context independent', async () => {
        await DdSdkReactNative.addAttribute('plan', 'paid');
        await DdSdkReactNative.setUserInfo({ id: 'user' });
        await DdSdkReactNative.setAccountInfo({ id: 'account' });
        await DdSdkReactNative.addAttributes({
            nested: { value: [true, null] }
        });
        await DdSdkReactNative.clearUserInfo();
        await DdSdkReactNative.removeAttribute('plan');
        expect(AttributesSingleton.getInstance().getAttributes()).toEqual({
            nested: { value: [true, null] }
        });
        expect(UserInfoSingleton.getInstance().getUserInfo()).toBeUndefined();
        expect(AccountInfoSingleton.getInstance().getAccountInfo()?.id).toBe(
            'account'
        );
        expect(mockNative.addAttribute).toHaveBeenCalledWith('plan', {
            value: 'paid'
        });
        expect(mockNative.removeAttribute).toHaveBeenCalledWith('plan');
    });
    it('keeps JavaScript context unchanged when native fails', async () => {
        await DdSdkReactNative.setUserInfo({ id: 'user' });
        await DdSdkReactNative.setAccountInfo({ id: 'account' });
        mockNative.clearUserInfo.mockResolvedValueOnce(false);
        mockNative.clearAccountInfo.mockRejectedValueOnce(Error('bridge'));
        await DdSdkReactNative.clearUserInfo();
        await DdSdkReactNative.clearAccountInfo();
        expect(UserInfoSingleton.getInstance().getUserInfo()?.id).toBe('user');
        expect(AccountInfoSingleton.getInstance().getAccountInfo()?.id).toBe(
            'account'
        );
        mockGet.mockReturnValue(null);
        await DdSdkReactNative.setUserInfo({ id: 'replacement' });
        await DdSdkReactNative.setAccountInfo({ id: 'replacement' });
        expect(UserInfoSingleton.getInstance().getUserInfo()?.id).toBe('user');
        expect(AccountInfoSingleton.getInstance().getAccountInfo()?.id).toBe(
            'account'
        );
    });
});
