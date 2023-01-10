/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { formatUserInfo } from '../utils';

describe('formatUserInfo', () => {
    it('formats a user info with all data', () => {
        expect(
            formatUserInfo({
                id: 'id',
                name: 'name',
                email: 'email',
                other: { nested: 'value' }
            })
        ).toEqual({
            id: 'id',
            name: 'name',
            email: 'email',
            extraInfo: { other: { nested: 'value' } }
        });
    });
    it('formats an empty user info', () => {
        expect(formatUserInfo({})).toEqual({ extraInfo: {} });
    });
});
