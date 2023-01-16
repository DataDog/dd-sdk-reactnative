/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import React from 'react';
import type { PropsWithChildren } from 'react';

import {
    DatadogProviderConfiguration,
    DdSdkReactNativeConfiguration
} from '../../DdSdkReactNativeConfiguration';
import type {
    PartialInitializationConfiguration,
    AutoInstrumentationConfiguration
} from '../../DdSdkReactNativeConfiguration';
import { DdSdkReactNative } from '../../DdSdkReactNative';
import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';

let isInitialized = false;

type Props = PropsWithChildren<{
    /**
     * If a `DatadogProviderConfiguration` instance is passed, the SDK will start tracking errors, resources and actions and sending events.
     *
     * If a `AutoInstrumentationConfiguration` object is passed, the SDK will start tracking errors, resources and actions. To start sending events, call `DatadogProvider.initialize`.
     */
    configuration:
        | DatadogProviderConfiguration
        | AutoInstrumentationConfiguration;
    /**
     * Callback to be run once the SDK starts sending events.
     */
    onInitialization?: () => void;
}>;

type StaticProperties = {
    initialize: (
        configuration: PartialInitializationConfiguration
    ) => Promise<void>;
    onInitialization?: () => void;
};

const isConfigurationPartial = (
    configuration:
        | DatadogProviderConfiguration
        | AutoInstrumentationConfiguration
): configuration is AutoInstrumentationConfiguration => {
    if (configuration instanceof DatadogProviderConfiguration) {
        return false;
    }
    if (configuration instanceof DdSdkReactNativeConfiguration) {
        // Not using InternalLog here as it is not yet instanciated
        console.warn(
            'A DdSdkReactNativeConfiguration was passed to DatadogProvider. Please use DatadogProviderConfiguration instead.'
        );
        return false;
    }
    return true;
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

/**
 * Set up the Datadog React Native SDK.
 */
export const DatadogProvider: React.FC<Props> & StaticProperties = ({
    children,
    configuration,
    onInitialization
}) => {
    if (!isInitialized) {
        // Here we cannot use a useEffect hook since it would be called after
        // the first render. Thus, we wouldn't enable auto-instrumentation on
        // the elements rendered in this first render and what happens during
        // the first render.
        if (isConfigurationPartial(configuration)) {
            DdSdkReactNative._enableFeaturesFromDatadogProvider(configuration);
            DatadogProvider.onInitialization = onInitialization;
        } else {
            initializeDatadog(configuration, onInitialization);
        }
        isInitialized = true;
    }

    return <>{children}</>;
};

/**
 * Initialize the Datadog SDK to start sending RUM events, logs and traces,
 * then execute onInitialization callback if any was provided.
 */
DatadogProvider.initialize = async (
    configuration: PartialInitializationConfiguration
) => {
    await DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync(
        configuration
    );
    if (DatadogProvider.onInitialization) {
        DatadogProvider.onInitialization();
    }
};

export const __internalResetIsInitializedForTesting = () => {
    isInitialized = false;
};
