/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DatadogProviderState } from '@datadog/mobile-react-native/internal';
import {
    DatadogProvider as CoreProvider,
    DatadogProviderConfiguration,
    DdSdkReactNative as CoreSdk,
    InternalLog,
    SdkVerbosity
} from '@datadog/mobile-react-native';
import type { PartialInitializationConfiguration } from '@datadog/mobile-react-native';
import React from 'react';
import type { ComponentProps } from 'react';

import { registerVegaBridge } from './CoreBridge';
import { withVegaBridge } from './SdkInitialization';

type Props = ComponentProps<typeof CoreProvider>;

const initializeProvider = async (
    configuration: DatadogProviderConfiguration,
    onInitialization?: () => void
): Promise<void> => {
    await CoreSdk._initializeFromDatadogProvider(configuration);
    try {
        onInitialization?.();
    } catch (error) {
        InternalLog.log(
            `Error running onInitialization callback ${error}`,
            SdkVerbosity.WARN
        );
    }
};

/** Reuses shared setup; full-provider failure handling is specific to Vega. */
export const DatadogProvider = Object.assign(
    ({ configuration, onInitialization, children }: Props) => {
        registerVegaBridge();
        if (configuration instanceof DatadogProviderConfiguration) {
            if (!DatadogProviderState.isInitialized) {
                DatadogProviderState.setInitialized();
                withVegaBridge(() =>
                    initializeProvider(configuration, onInitialization)
                );
            }
            return <>{children}</>;
        }
        return (
            <CoreProvider
                configuration={configuration}
                onInitialization={onInitialization}
            >
                {children}
            </CoreProvider>
        );
    },
    {
        initialize: (
            configuration: PartialInitializationConfiguration
        ): Promise<void> =>
            withVegaBridge(() => CoreProvider.initialize(configuration))
    }
);
