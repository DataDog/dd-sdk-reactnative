/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    clearCachedAccountId,
    clearCachedSessionId,
    clearCachedUserId,
    getCachedAccountId
} from '../../../rum/helper';
import { firstPartyHostsRegexMapBuilder } from '../../../rum/instrumentation/resourceTracking/distributedTracing/firstPartyHosts';
import { DATADOG_BAGGAGE_HEADER } from '../../../rum/instrumentation/resourceTracking/headers';
import { createRequestContext } from '../../../rum/instrumentation/resourceTracking/requestProxy/common/RequestContext';
import { getInstrumentationHeaders } from '../../../rum/instrumentation/resourceTracking/requestProxy/common/requestHeaders';
import { PropagatorType } from '../../../rum/types';
import { AccountInfoSingleton } from '../AccountInfoSingleton';

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

describe('AccountInfoSingleton', () => {
    beforeEach(() => {
        AccountInfoSingleton.reset();
        clearCachedSessionId();
        clearCachedUserId();
        clearCachedAccountId();
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

    it('clears the cached account id used by RequestContext baggage after clearAccountInfo', () => {
        const accountId = 'previous-account';
        AccountInfoSingleton.getInstance().setAccountInfo({
            id: accountId,
            extraInfo: {}
        });

        expect(getCachedAccountId()).toBe(accountId);
        expect(getBaggageHeader()).toBe(`account.id=${accountId}`);

        AccountInfoSingleton.getInstance().clearAccountInfo();

        expect(
            AccountInfoSingleton.getInstance().getAccountInfo()
        ).toBeUndefined();
        expect(getCachedAccountId()).toBeUndefined();
        expect(getBaggageHeader() ?? '').not.toContain(
            `account.id=${accountId}`
        );
    });
});
