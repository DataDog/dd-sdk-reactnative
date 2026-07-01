/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { evaluate, md5, regexMatches, semverMatches } from '..';
import type { UniversalFlagConfiguration } from '../types';

describe('js UFC evaluator', () => {
    it('hashes with MD5 for shard parity', () => {
        expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
        expect(md5('allocation-empty-shards-user-123')).toBe(
            '982e0e772b4a7217cc4d9ec58bbd28f3'
        );
    });

    it('normalizes regex dialect used by the maxcomplex fixture', () => {
        expect(regexMatches('(?i)pixel [6-9]', 'Pixel 8')).toBe(true);
        expect(regexMatches('(?u)\\bmañana\\b', 'hasta mañana')).toBe(true);
        expect(
            regexMatches(
                '^([[:alnum:]._%+-]+)@capture\\.example$',
                'user.123@capture.example'
            )
        ).toBe(true);
        expect(regexMatches('(?i', 'Pixel 8')).toBe(false);
    });

    it('evaluates all semver operators', () => {
        expect(semverMatches('SEMVER_EQ', '1.2.3', '1.2.3')).toBe(true);
        expect(semverMatches('SEMVER_NEQ', '1.2.4', '1.2.3')).toBe(true);
        expect(semverMatches('SEMVER_GT', '1.2.4', '1.2.3')).toBe(true);
        expect(semverMatches('SEMVER_GTE', '1.2.3', '1.2.3')).toBe(true);
        expect(semverMatches('SEMVER_LT', '1.2.2', '1.2.3')).toBe(true);
        expect(semverMatches('SEMVER_LTE', '1.2.3-beta.2', '1.2.3')).toBe(
            true
        );
    });

    it('evaluates semver and regex flags with native-compatible reasons', () => {
        const semverResult = evaluate(
            configuration,
            'string',
            'semver-gated',
            'fallback',
            {
                targetingKey: 'user-123',
                attributes: {
                    app_version: '2.47.0',
                    device: 'Pixel 8'
                }
            }
        );
        expect(semverResult).toMatchObject({
            value: 'enabled',
            variant: 'enabled',
            reason: 'TARGETING_MATCH'
        });

        const regexResult = evaluate(
            configuration,
            'boolean',
            'regex-gated',
            false,
            {
                targetingKey: 'user-123',
                attributes: {
                    app_version: '2.47.0',
                    device: 'Pixel 8'
                }
            }
        );
        expect(regexResult).toMatchObject({
            value: true,
            variant: 'on',
            reason: 'TARGETING_MATCH'
        });

        const defaultResult = evaluate(
            configuration,
            'string',
            'semver-gated',
            'fallback',
            {
                targetingKey: 'user-123',
                attributes: {
                    app_version: '2.47.0-alpha.1',
                    device: 'Pixel 8'
                }
            }
        );
        expect(defaultResult).toMatchObject({
            value: 'default',
            variant: 'default',
            reason: 'STATIC'
        });
    });
});

const configuration: UniversalFlagConfiguration = {
    flags: {
        'semver-gated': {
            key: 'semver-gated',
            enabled: true,
            variationType: 'STRING',
            variations: {
                enabled: {
                    key: 'enabled',
                    value: 'enabled'
                },
                default: {
                    key: 'default',
                    value: 'default'
                }
            },
            allocations: [
                {
                    key: 'semver-match',
                    rules: [
                        {
                            conditions: [
                                {
                                    operator: 'SEMVER_GTE',
                                    attribute: 'app_version',
                                    value: '2.47.0-beta.3'
                                },
                                {
                                    operator: 'SEMVER_LT',
                                    attribute: 'app_version',
                                    value: '3.0.0'
                                }
                            ]
                        }
                    ],
                    splits: [{ variationKey: 'enabled', shards: [] }]
                },
                {
                    key: 'default',
                    splits: [{ variationKey: 'default', shards: [] }]
                }
            ]
        },
        'regex-gated': {
            key: 'regex-gated',
            enabled: true,
            variationType: 'BOOLEAN',
            variations: {
                on: {
                    key: 'on',
                    value: true
                },
                off: {
                    key: 'off',
                    value: false
                }
            },
            allocations: [
                {
                    key: 'regex-match',
                    rules: [
                        {
                            conditions: [
                                {
                                    operator: 'MATCHES',
                                    attribute: 'device',
                                    value: '(?i)pixel [6-9]'
                                }
                            ]
                        }
                    ],
                    splits: [{ variationKey: 'on', shards: [] }]
                },
                {
                    key: 'default',
                    splits: [{ variationKey: 'off', shards: [] }]
                }
            ]
        }
    }
};
