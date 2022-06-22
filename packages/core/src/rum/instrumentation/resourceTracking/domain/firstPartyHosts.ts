/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../../InternalLog';
import { SdkVerbosity } from '../../../../SdkVerbosity';

export type Hostname = { _type: 'Hostname' } & string;

// This regex does not match anything
export const NO_MATCH_REGEX = new RegExp('a^');

export const firstPartyHostsRegexBuilder = (
    firstPartyHosts: string[]
): RegExp => {
    if (firstPartyHosts.length === 0) {
        return NO_MATCH_REGEX;
    }
    try {
        // A regexp for matching hosts, e.g. when `hosts` is "example.com", it will match
        // "example.com", "api.example.com", but not "foo.com".
        const firstPartyHostsRegex = new RegExp(
            `^(.*\\.)*(${firstPartyHosts.map(host => `${host}$`).join('|')})`
        );
        firstPartyHostsRegex.test('test_the_regex_is_valid');
        return firstPartyHostsRegex;
    } catch (e) {
        InternalLog.log(
            `Invalid first party hosts list ${JSON.stringify(
                firstPartyHosts
            )}. Regular expressions are not allowed.`,
            SdkVerbosity.WARN
        );
        return NO_MATCH_REGEX;
    }
};

export const isHostFirstParty = (
    hostname: Hostname,
    firstPartyHostsRegex: RegExp
): boolean => {
    return firstPartyHostsRegex.test(hostname);
};
