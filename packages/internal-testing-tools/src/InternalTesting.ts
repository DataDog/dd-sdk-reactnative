/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { NativeInternalTestingType } from './nativeModulesTypes';

export class InternalTestingWrapper {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeInternalTesting: NativeInternalTestingType = require('./specs/NativeDdInternalTesting')
        .default;

    /**
     * Enable internal testing.
     * Must be called before initializing the SDK.
     */
    enable = (): Promise<void> => {
        return this.nativeInternalTesting.enable();
    };
}

export const InternalTesting = new InternalTestingWrapper();
