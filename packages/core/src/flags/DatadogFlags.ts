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
    private _isEnabled = false;

    getClient = (clientName: string = 'default'): FlagsClient => {
        if (__DEV__) {
            if (!this._isEnabled) {
                InternalLog.log(
                    'DatadogFlags.getClient() called before DatadogFlags have been initialized. Flag evaluations will resolve to default values.',
                    SdkVerbosity.ERROR
                );
            }
        }

        return new FlagsClient(clientName);
    };

    enable = async (
        _configuration: DatadogFlagsConfiguration
    ): Promise<void> => {
        // Feature Flags are initialized globally by default for now.
        this._isEnabled = _configuration.enabled;

        return Promise.resolve();
    };
}

export const DatadogFlags: DatadogFlagsType = getGlobalInstance(
    FLAGS_MODULE,
    () => new DatadogFlagsWrapper()
);
