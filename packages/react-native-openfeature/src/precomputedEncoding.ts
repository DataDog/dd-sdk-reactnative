/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { FlagsConfiguration } from '@datadog/flagging-core';

export function requiresEncodedPrecomputedEvaluation(
    precomputed: FlagsConfiguration['precomputed']
): boolean {
    const attributes = precomputed?.response?.data?.attributes;
    return (
        (attributes?.obfuscated !== undefined &&
            attributes.obfuscated !== false) ||
        attributes?.obfuscation !== undefined
    );
}
