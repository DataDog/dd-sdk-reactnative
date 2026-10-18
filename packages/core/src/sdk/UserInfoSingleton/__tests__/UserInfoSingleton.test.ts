/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    clearCachedAccountId,
    clearCachedSessionId,
    clearCachedUserId,
    getCachedUserId
} from '../../../rum/helper';
import { firstPartyHostsRegexMapBuilder } from '../../../rum/instrumentation/resourceTracking/distributedTracing/firstPartyHosts';
import { DATADOG_BAGGAGE_HEADER } from '../../../rum/instrumentation/resourceTracking/headers';
import { createRequestContext } from '../../../rum/instrumentation/resourceTracking/requestProxy/common/RequestContext';
import { getInstrumentationHeaders } from '../../../rum/instrumentation/resourceTracking/requestProxy/common/requestHeaders';
import { PropagatorType } from '../../../rum/types';
import { UserInfoSingleton } from '../UserInfoSingleton';

const firstPartyRequestOptions = {
    tracingSamplingRate: 100,
    firstPartyHostsRegexMap: firstPartyHostsRegexMapBuilder([
        {
            match: 'api.example.com',
            propagatorTypes: [
                PropagatorType.DATADOG,
                PropagatorType.TRACECONTEXT
            ]
        }
    ])
};

const getBaggageHeader = (): string | undefined => {
    const context = createRequestContext({
        method: 'GET',
        url: 'https://api.example.com/v1/resource',
        options: firstPartyRequestOptions
    });
    return getInstrumentationHeaders(context).find(
        header => header.header === DATADOG_BAGGAGE_HEADER
    )?.value;
};

describe('UserInfoSingleton', () => {
    beforeEach(() => {
        UserInfoSingleton.reset();
        clearCachedSessionId();
        clearCachedUserId();
        clearCachedAccountId();
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

    it('clears the cached user id used by RequestContext baggage after clearUserInfo', () => {
        const userId = 'previous-user';
        UserInfoSingleton.getInstance().setUserInfo({
            id: userId,
            extraInfo: {}
        });

        expect(getCachedUserId()).toBe(userId);
        expect(getBaggageHeader()).toBe(`user.id=${userId}`);

        UserInfoSingleton.getInstance().clearUserInfo();

        expect(UserInfoSingleton.getInstance().getUserInfo()).toBeUndefined();
        expect(getCachedUserId()).toBeUndefined();
        expect(getBaggageHeader() ?? '').not.toContain(`user.id=${userId}`);
    });
});
