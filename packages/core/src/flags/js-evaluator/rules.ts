/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { regexMatches } from './regex';
import { semverMatches } from './semver';
import type { Condition, Rule } from './types';

export function matchesRule(
    rule: Rule,
    subjectAttributes: Record<string, unknown>
): boolean {
    return (rule.conditions ?? []).every(condition =>
        evaluateCondition(subjectAttributes, condition)
    );
}

function evaluateCondition(
    subjectAttributes: Record<string, unknown>,
    condition: Condition
): boolean {
    const value = subjectAttributes[condition.attribute];
    if (condition.operator === 'IS_NULL') {
        return condition.value === true ? value == null : value != null;
    }
    if (value == null) {
        return false;
    }
    switch (condition.operator) {
        case 'MATCHES':
            return regexMatches(String(condition.value), String(value));
        case 'NOT_MATCHES':
            return !regexMatches(String(condition.value), String(value));
        case 'ONE_OF':
            return containsComparableValue(condition.value, value);
        case 'NOT_ONE_OF':
            return !containsComparableValue(condition.value, value);
        case 'GTE':
            return compareNumbers(value, condition.value, (left, right) => left >= right);
        case 'GT':
            return compareNumbers(value, condition.value, (left, right) => left > right);
        case 'LTE':
            return compareNumbers(value, condition.value, (left, right) => left <= right);
        case 'LT':
            return compareNumbers(value, condition.value, (left, right) => left < right);
        case 'SEMVER_EQ':
        case 'SEMVER_NEQ':
        case 'SEMVER_GT':
        case 'SEMVER_GTE':
        case 'SEMVER_LT':
        case 'SEMVER_LTE':
            return semverMatches(condition.operator, value, condition.value);
        default:
            return false;
    }
}

function compareNumbers(
    actual: unknown,
    expected: unknown,
    comparator: (left: number, right: number) => boolean
): boolean {
    const actualNumber = Number(actual);
    const expectedNumber = Number(expected);
    return (
        Number.isFinite(actualNumber) &&
        Number.isFinite(expectedNumber) &&
        comparator(actualNumber, expectedNumber)
    );
}

function containsComparableValue(values: unknown, actual: unknown): boolean {
    if (!Array.isArray(values)) {
        return false;
    }
    const expected = new Set(values.map(value => String(value)));
    return matchableStrings(actual).some(value => expected.has(value));
}

function matchableStrings(value: unknown): string[] {
    const strings = new Set<string>();
    strings.add(String(value));
    if (typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)) {
        strings.add(Math.trunc(value).toString());
    }
    return Array.from(strings);
}
