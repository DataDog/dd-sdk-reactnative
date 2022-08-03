/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { firstPartyHostsRegexBuilder } from '../firstPartyHosts';

describe('firstPartyHosts', () => {
    describe('firstPartyHostsRegexBuilder', () => {
        it('returns a RegExp that matches hosts', () => {
            const regex = firstPartyHostsRegexBuilder(['api.example.com']);
            expect(regex.test('api.example.com')).toBe(true);
            expect(regex.test('api.myapi.com')).toBe(false);
        });

        it('escapes special characters in hosts', () => {
            const regex = firstPartyHostsRegexBuilder(['api.example.com']);
            expect(regex.test('apiiexample.com')).toBe(false);
        });
    });
});
