/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';
import type { DdNativeFlagsType } from '../nativeModulesTypes';
import { getGlobalInstance } from '../utils/singletonUtils';

import { FlagsClient } from './FlagsClient';
import type { DdFlagsType, FlagsConfiguration } from './types';

const FLAGS_MODULE = 'com.datadog.reactnative.flags';

/**
 * Implementation class for {@link DdFlagsType}. Please see the interface for documentation.
 */
class DdFlagsWrapper implements DdFlagsType {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeFlags: DdNativeFlagsType = require('../specs/NativeDdFlags')
        .default;

    private isFeatureEnabled = false;

    private clients: Record<string, FlagsClient> = {};

    enable = async (configuration: FlagsConfiguration = {}): Promise<void> => {
        await this.nativeFlags.enable({ enabled: true, ...configuration });

        this.isFeatureEnabled = true;
    };

    getClient = (clientName: string = 'default'): FlagsClient => {
        if (!this.isFeatureEnabled) {
            InternalLog.log(
                '`DdFlags.getClient()` called before Datadog Flags feature have been enabled. Client will fall back to serving default flag values.',
                SdkVerbosity.ERROR
            );
        }

        this.clients[clientName] ??= new FlagsClient(clientName);

        return this.clients[clientName];
    };
}

export const DdFlags: DdFlagsType = getGlobalInstance(
    FLAGS_MODULE,
    () => new DdFlagsWrapper()
);
