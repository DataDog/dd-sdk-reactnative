/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import React from 'react';
import type { PropsWithChildren } from 'react';

import type { DatadogProviderConfiguration } from '../DdSdkReactNativeConfiguration';
import { DdSdkReactNative } from '../DdSdkReactNative';

type Props = PropsWithChildren<{
    configuration: DatadogProviderConfiguration;
}>;

type StaticProperties = {
    isInitialized: boolean;
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
        DdSdkReactNative._initializeFromDatadogProvider(configuration);
        DatadogProvider.isInitialized = true;
    }

    return <>{children}</>;
};

DatadogProvider.isInitialized = false;
