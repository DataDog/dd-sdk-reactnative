/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';
import type { DdNativeFlagsType } from '../nativeModulesTypes';

class DdFlagsWrapper {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeFlags: DdNativeFlagsType = require('../specs/NativeDdFlags')
        .default;

    getConstant = (): Promise<number> => {
        InternalLog.log('Flags.getConstant()', SdkVerbosity.DEBUG);

        return this.nativeFlags.getConstant();
    };
}

const DdFlags = new DdFlagsWrapper();

export { DdFlags };
