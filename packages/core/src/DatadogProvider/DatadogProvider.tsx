/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import React from 'react';
import type { PropsWithChildren } from 'react';

import type {
    DatadogProviderConfiguration,
    PartialInitializationConfiguration,
    AutoInstrumentationConfiguration
} from '../DdSdkReactNativeConfiguration';
import { DdSdkReactNative } from '../DdSdkReactNative';
import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';

type Props = PropsWithChildren<{
    configuration:
        | DatadogProviderConfiguration
        | AutoInstrumentationConfiguration;
    onInitialization?: () => void;
}>;

type StaticProperties = {
    isInitialized: boolean;
    initialize: (
        configuration: PartialInitializationConfiguration
    ) => Promise<void>;
};

const isConfigurationPartial = (
    configuration:
        | DatadogProviderConfiguration
        | AutoInstrumentationConfiguration
): configuration is AutoInstrumentationConfiguration => {
    return !('applicationId' in configuration);
};

const initializeDatadog = async (
    configuration: DatadogProviderConfiguration,
    onInitialization?: () => void
) => {
    await DdSdkReactNative._initializeFromDatadogProvider(configuration);
    if (onInitialization) {
        try {
            onInitialization();
        } catch (error) {
            InternalLog.log(
                `Error running onInitialization callback ${error}`,
                SdkVerbosity.WARN
            );
        }
    }
};

export const DatadogProvider: React.FC<Props> & StaticProperties = ({
    children,
    configuration,
    onInitialization
}) => {
    if (!DatadogProvider.isInitialized) {
        // Here we cannot use a useEffect hook since it would be called after
        // the first render. Thus, we wouldn't enable auto-instrumentation on
        // the elements rendered in this first render and what happens during
        // the first render.
        if (isConfigurationPartial(configuration)) {
            DdSdkReactNative._enableFeaturesFromDatadogProvider(configuration);
        } else {
            initializeDatadog(configuration, onInitialization);
        }
        DatadogProvider.isInitialized = true;
    }

    return <>{children}</>;
};

DatadogProvider.isInitialized = false;
DatadogProvider.initialize = (
    configuration: PartialInitializationConfiguration
) => {
    return DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync(
        configuration
    );
};
