/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { createHash } from 'crypto';

import { precomputedConfiguration } from './coreConfiguration';

export const encodedFlagKey = 'checkout-\u00e9-\ud83d\ude80';

export function encodedConfiguration() {
    const configuration = precomputedConfiguration();
    const attributes = configuration.precomputed.response.data.attributes;
    const salt = '00112233445566778899aabbccddeeff';
    const flags = {
        ...attributes.flags,
        [encodedFlagKey]: { ...attributes.flags['boolean-flag'], serialId: 42 }
    };
    configuration.precomputed.response.data.attributes = {
        ...attributes,
        obfuscated: true,
        obfuscation: { scheme: 'flag-key-sha256-v1', salt },
        evaluation_options: { experimentation_opt_out: false },
        flags: Object.fromEntries(
            Object.entries(flags).map(([key, flag]) => [
                createHash('sha256')
                    .update('datadog.feature-flags.flag-key.v1\0')
                    .update(Buffer.from(salt, 'hex'))
                    .update(key)
                    .digest('hex'),
                flag
            ])
        )
    };
    return configuration;
}
