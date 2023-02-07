/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    FirstPartyHost,
    PropagatorType
} from '../../../../DdSdkReactNativeConfiguration';
import { InternalLog } from '../../../../InternalLog';
import { SdkVerbosity } from '../../../../SdkVerbosity';

import type { RegexMap } from './interfaces/RequestProxy';

export type Hostname = { _type: 'Hostname' } & string;

// This regex does not match anything
export const NO_MATCH_REGEX = new RegExp('a^');

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

export const firstPartyHostsRegexMapBuilder = (
    firstPartyHosts: FirstPartyHost[]
): RegexMap => {
    const hostsMap: Record<PropagatorType, string[]> = {
        datadog: [],
        tracecontext: [],
        b3: [],
        b3multi: []
    };

    firstPartyHosts.forEach(host => {
        host.propagatorTypes.forEach(propagatorType => {
            hostsMap[propagatorType].push(host.match);
        });
    });

    const regexMap: { regex: RegExp; propagatorType: PropagatorType }[] = [];
    Object.entries(hostsMap).forEach(([propagatorType, hosts]) => {
        if (hosts.length > 0) {
            regexMap.push({
                propagatorType: propagatorType as PropagatorType,
                regex: firstPartyHostsRegexBuilder(hosts)
            });
        }
    });

    return regexMap;
};

const firstPartyHostsRegexBuilder = (firstPartyHosts: string[]): RegExp => {
    if (firstPartyHosts.length === 0) {
        return NO_MATCH_REGEX;
    }
    try {
        // A regexp for matching hosts, e.g. when `hosts` is "example.com", it will match
        // "example.com", "api.example.com", but not "foo.com".
        const firstPartyHostsRegex = new RegExp(
            `^(.*\\.)*(${firstPartyHosts
                .map(host => `${escapeRegExp(host)}$`)
                .join('|')})`
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
    firstPartyHostsRegexMap: RegexMap
): PropagatorType[] | null => {
    const matchedPropagatorTypes: PropagatorType[] = [];
    firstPartyHostsRegexMap.forEach(({ regex, propagatorType }) => {
        if (regex.test(hostname)) {
            matchedPropagatorTypes.push(propagatorType);
        }
    });
    return matchedPropagatorTypes.length > 0 ? matchedPropagatorTypes : null;
};
