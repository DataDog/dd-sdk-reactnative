/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';

export function warn(text: string) {
    InternalLog.log(`[ATTRIBUTES] ${text}`, SdkVerbosity.WARN);
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
    return !!v && typeof v === 'object' && (v as any).constructor === Object;
}

/**
 * Utility: format a path array into dot/bracket notation (for logs).
 */
export function formatPathForLog(path: (string | number)[]): string {
    return path
        .map((segment, index) => {
            const s = String(segment);
            if (/^\d/.test(s)) {
                return `[${s}]`;
            }
            return index === 0 ? s : `.${s}`;
        })
        .join('');
}
