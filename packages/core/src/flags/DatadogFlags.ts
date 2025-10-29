/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';

import { FlagsClient } from './FlagsClient';
import type { DatadogFlagsConfiguration } from './types';

class DatadogFlagsWrapper {
    getClient = (clientName: string = 'default'): FlagsClient => {
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

const DatadogFlags = new DatadogFlagsWrapper();

export { DatadogFlags };
