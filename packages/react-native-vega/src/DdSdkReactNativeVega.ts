/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { AttributesSingleton } from '@datadog/mobile-react-native/internal';
import type { Attributes } from '@datadog/mobile-react-native/internal';

import { callNative } from './callNative';
import { VegaSdk } from './SdkInitialization';
import { getNativeDdSdk } from './turbo-modules/NativeDdSdk';

/** Global attributes for future events, alongside the shared initialization APIs. */
export class DdSdkReactNative extends VegaSdk {
    static addAttribute = async (
        key: string,
        value: unknown
    ): Promise<void> => {
        if (
            await callNative(getNativeDdSdk, native =>
                native.addAttribute(key, { value })
            )
        ) {
            AttributesSingleton.getInstance().addAttribute(key, value);
        }
    };

    static removeAttribute = async (key: string): Promise<void> => {
        if (
            await callNative(getNativeDdSdk, native =>
                native.removeAttribute(key)
            )
        ) {
            AttributesSingleton.getInstance().removeAttribute(key);
        }
    };

    static addAttributes = async (attributes: Attributes): Promise<void> => {
        if (
            await callNative(getNativeDdSdk, native =>
                native.addAttributes(attributes)
            )
        ) {
            AttributesSingleton.getInstance().addAttributes(attributes);
        }
    };

    static removeAttributes = async (keys: string[]): Promise<void> => {
        if (
            await callNative(getNativeDdSdk, native =>
                native.removeAttributes(keys)
            )
        ) {
            AttributesSingleton.getInstance().removeAttributes(keys);
        }
    };
}
