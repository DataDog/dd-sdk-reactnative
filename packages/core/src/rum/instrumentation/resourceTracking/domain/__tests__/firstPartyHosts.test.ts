/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { PropagatorType } from '../../../../../DdSdkReactNativeConfiguration';
import { firstPartyHostsRegexMapBuilder } from '../firstPartyHosts';

describe('firstPartyHosts', () => {
    describe('firstPartyHostsRegexMapBuilder', () => {
        it('returns a RegExp that matches hosts', () => {
            const regexMap = firstPartyHostsRegexMapBuilder([
                {
                    match: 'api.example.com',
                    propagatorTypes: [PropagatorType.DATADOG]
                }
            ]);
            expect(regexMap[0].propagatorType).toBe('datadog');
            expect(regexMap[0].regex.test('api.example.com')).toBe(true);
            expect(regexMap[0].regex.test('api.myapi.com')).toBe(false);
        });

        it('escapes special characters in hosts', () => {
            const regexMap = firstPartyHostsRegexMapBuilder([
                {
                    match: 'api.example.com',
                    propagatorTypes: [PropagatorType.DATADOG]
                }
            ]);
            expect(regexMap[0].regex.test('apiiexample.com')).toBe(false);
        });
    });
});
