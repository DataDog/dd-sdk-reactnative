/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';
import { getGlobalInstance } from '../utils/singletonUtils';

import { FlagsClient } from './FlagsClient';
import type { DatadogFlagsType, DatadogFlagsConfiguration } from './types';

const FLAGS_MODULE = 'com.datadog.reactnative.flags';

class DatadogFlagsWrapper implements DatadogFlagsType {
    getClient = (clientName: string = 'default'): FlagsClient => {
        // TODO: Do we have to track whether .enabled() was called before .getClient() could be called?
        return new FlagsClient(clientName);
    };

    enable = async (
        _configuration: DatadogFlagsConfiguration
    ): Promise<void> => {
        InternalLog.log(
            'No-op DatadogFlags.enable() called. Flags are initialized globally by default for now.',
            SdkVerbosity.DEBUG
        );

        return Promise.resolve();
    };
}

export const DatadogFlags: DatadogFlagsType = getGlobalInstance(
    FLAGS_MODULE,
    () => new DatadogFlagsWrapper()
);
