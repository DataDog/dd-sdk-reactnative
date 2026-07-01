/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

type Semver = {
    major: number;
    minor: number;
    patch: number;
    prerelease: string[];
};

export function semverMatches(
    operator: string,
    actual: unknown,
    expected: unknown
): boolean {
    const comparison = compareSemver(String(actual), String(expected));
    if (comparison === undefined) {
        return false;
    }
    switch (operator) {
        case 'SEMVER_EQ':
            return comparison === 0;
        case 'SEMVER_NEQ':
            return comparison !== 0;
        case 'SEMVER_GT':
            return comparison > 0;
        case 'SEMVER_GTE':
            return comparison >= 0;
        case 'SEMVER_LT':
            return comparison < 0;
        case 'SEMVER_LTE':
            return comparison <= 0;
        default:
            return false;
    }
}

function compareSemver(left: string, right: string): number | undefined {
    const parsedLeft = parseSemver(left);
    const parsedRight = parseSemver(right);
    if (!parsedLeft || !parsedRight) {
        return undefined;
    }
    const coreComparison =
        compareNumber(parsedLeft.major, parsedRight.major) ||
        compareNumber(parsedLeft.minor, parsedRight.minor) ||
        compareNumber(parsedLeft.patch, parsedRight.patch);
    if (coreComparison !== 0) {
        return coreComparison;
    }
    return comparePrerelease(parsedLeft.prerelease, parsedRight.prerelease);
}

function parseSemver(value: string): Semver | undefined {
    const normalized = value.trim().replace(/^v/i, '').split('+')[0];
    const match = normalized.match(
        /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?$/
    );
    if (!match) {
        return undefined;
    }
    return {
        major: Number(match[1]),
        minor: Number(match[2] ?? '0'),
        patch: Number(match[3] ?? '0'),
        prerelease: match[4]?.split('.') ?? []
    };
}

function comparePrerelease(left: string[], right: string[]): number {
    if (left.length === 0 && right.length === 0) {
        return 0;
    }
    if (left.length === 0) {
        return 1;
    }
    if (right.length === 0) {
        return -1;
    }
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
        const leftIdentifier = left[index];
        const rightIdentifier = right[index];
        if (leftIdentifier === undefined) {
            return -1;
        }
        if (rightIdentifier === undefined) {
            return 1;
        }
        const comparison = comparePrereleaseIdentifier(
            leftIdentifier,
            rightIdentifier
        );
        if (comparison !== 0) {
            return comparison;
        }
    }
    return 0;
}

function comparePrereleaseIdentifier(left: string, right: string): number {
    const leftNumeric = /^\d+$/.test(left);
    const rightNumeric = /^\d+$/.test(right);
    if (leftNumeric && rightNumeric) {
        return compareNumber(Number(left), Number(right));
    }
    if (leftNumeric) {
        return -1;
    }
    if (rightNumeric) {
        return 1;
    }
    return compareNumber(left.localeCompare(right), 0);
}

function compareNumber(left: number, right: number): number {
    if (left < right) {
        return -1;
    }
    if (left > right) {
        return 1;
    }
    return 0;
}
