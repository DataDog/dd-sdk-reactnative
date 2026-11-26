/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DatadogProvider as CoreProvider } from '@datadog/mobile-react-native';
import type { PartialInitializationConfiguration } from '@datadog/mobile-react-native';
import React from 'react';
import type { ComponentProps } from 'react';

import { registerVegaBridge } from './CoreBridge';
import { withVegaBridge } from './SdkInitialization';

/** Uses the shared provider, including deferred setup and initialization callbacks. */
export const DatadogProvider = Object.assign(
    (props: ComponentProps<typeof CoreProvider>) => {
        registerVegaBridge();
        return <CoreProvider {...props} />;
    },
    {
        initialize: (
            configuration: PartialInitializationConfiguration
        ): Promise<void> =>
            withVegaBridge(() => CoreProvider.initialize(configuration))
    }
);
