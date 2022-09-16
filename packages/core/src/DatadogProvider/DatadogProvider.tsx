/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import React from 'react';
import type { PropsWithChildren } from 'react';

import type {
    DatadogProviderConfiguration,
    SkipInitializationConfiguration,
    SkipInitializationFeatures
} from '../DdSdkReactNativeConfiguration';
import { DdSdkReactNative } from '../DdSdkReactNative';

type Props = PropsWithChildren<{
    configuration: DatadogProviderConfiguration | SkipInitializationFeatures;
}>;

type StaticProperties = {
    isInitialized: boolean;
    initialize: (
        configuration: SkipInitializationConfiguration
    ) => Promise<void>;
};

const isConfigurationSkip = (
    configuration: DatadogProviderConfiguration | SkipInitializationFeatures
): configuration is SkipInitializationFeatures => {
    return !('applicationId' in configuration);
};

export const DatadogProvider: React.FC<Props> & StaticProperties = ({
    children,
    configuration
}) => {
    if (!DatadogProvider.isInitialized) {
        // Here we cannot use a useEffect hook since it would be called after
        // the first render. Thus, we wouldn't enable auto-instrumentation on
        // the elements rendered in this first render and what happens during
        // the first render.
        if (isConfigurationSkip(configuration)) {
            DdSdkReactNative._enableFeaturesFromDatadogProvider(configuration);
        } else {
            DdSdkReactNative._initializeFromDatadogProvider(configuration);
        }
        DatadogProvider.isInitialized = true;
    }

    return <>{children}</>;
};

DatadogProvider.isInitialized = false;
DatadogProvider.initialize = (
    configuration: SkipInitializationConfiguration
) => {
    return DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync(
        configuration
    );
};
