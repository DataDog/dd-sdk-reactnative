/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdSdk } from '../DdSdk';

import { builtInEncoders } from './defaultEncoders';
import { encodeAttributesInPlace, type EncodeContext } from './helpers';
import type { Encodable } from './types';
import { isPlainObject, warn } from './utils';

/**
 * Encodes arbitrary input into a flat dictionary of attributes.
 * - Objects are flattened using dot syntax. Max depth handling is done on the native layer by the
 *   Android and iOS SDKs.
 * - We assume the input does not always conform to Record<string, Encodable> and we:
 *    - Fallback to { context: givenValue } if a primitive is passed
 *    - Apply built-in and consumer encoders to all values
 *    - Drop values of unsupported types
 */
export function encodeAttributes(input: unknown): Record<string, Encodable> {
    const result: Record<string, Encodable> = {};
    const allEncoders = [...DdSdk.attributeEncoders, ...builtInEncoders];
    const context: EncodeContext = { numOfAttributes: 0 };
    if (isPlainObject(input)) {
        for (const [k, v] of Object.entries(input)) {
            encodeAttributesInPlace(v, result, [k], allEncoders, context);
        }
    } else {
        // Fallback for primitive values passed as root
        encodeAttributesInPlace(input, result, ['context'], allEncoders, context);
        warn(
            'Warning: attributes root should be an object.\n' +
                'Received a primitive/array instead, which will be wrapped under the "context" key.'
        );
    }

    return result;
}
