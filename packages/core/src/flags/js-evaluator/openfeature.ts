/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export const ErrorCode = {
    PROVIDER_NOT_READY: 'PROVIDER_NOT_READY',
    FLAG_NOT_FOUND: 'FLAG_NOT_FOUND',
    TYPE_MISMATCH: 'TYPE_MISMATCH',
    TARGETING_KEY_MISSING: 'TARGETING_KEY_MISSING',
    GENERAL: 'GENERAL'
} as const;

export const StandardResolutionReasons = {
    ERROR: 'ERROR',
    DISABLED: 'DISABLED',
    DEFAULT: 'DEFAULT',
    STATIC: 'STATIC',
    SPLIT: 'SPLIT',
    TARGETING_MATCH: 'TARGETING_MATCH'
} as const;

export class TargetingKeyMissingError extends Error {
    constructor() {
        super('Targeting key is required for sharded flag evaluation');
    }
}
