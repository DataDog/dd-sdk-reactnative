/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DatadogProviderState } from '@datadog/mobile-react-native/internal';
import {
    InternalLog,
    DatadogProviderConfiguration,
    CoreConfiguration,
    SdkVerbosity
} from '@datadog/mobile-react-native';
import type {
    FileBasedConfiguration,
    AutoInstrumentationConfiguration,
    PartialInitializationConfiguration
} from '@datadog/mobile-react-native';
import React from 'react';
import type { PropsWithChildren } from 'react';

import { DdSdkReactNativeVega } from './DdSdkReactNativeVega';

type Props = PropsWithChildren<{
    /**
     * If a `DatadogProviderConfiguration` instance is passed, the SDK will start tracking errors, resources and actions and sending events.
     *
     * If a `AutoInstrumentationConfiguration` object is passed, the SDK will start tracking errors, resources and actions. To start sending events, call `DatadogProvider.initialize`.
     */
    configuration:
        | DatadogProviderConfiguration
        | AutoInstrumentationConfiguration
        | FileBasedConfiguration;
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
    if (configuration instanceof CoreConfiguration) {
        console.warn(
            'A CoreConfiguration was passed to DatadogProvider. Please use DatadogProviderConfiguration instead.'
        );
        return false;
    }
    return true;
};

const initializeDatadog = async (
    configuration: DatadogProviderConfiguration,
    onInitialization?: () => void
) => {
    await DdSdkReactNativeVega._initializeFromDatadogProvider(configuration);
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
 * Set up the Datadog React Native SDK for Vega OS.
 */
export const DatadogProviderVega: React.FC<Props> & StaticProperties = ({
    children,
    configuration,
    onInitialization
}) => {
    if (!DatadogProviderState.isInitialized) {
        if (isConfigurationPartial(configuration)) {
            DdSdkReactNativeVega._enableFeaturesFromDatadogProvider(
                configuration
            );
            DatadogProviderVega.onInitialization = onInitialization;
        } else {
            initializeDatadog(configuration, onInitialization);
        }
        DatadogProviderState.setInitialized();
    }

    return <>{children}</>;
};

/**
 * Initialize the Datadog SDK to start sending RUM events,
 * then execute onInitialization callback if any was provided.
 */
DatadogProviderVega.initialize = async (
    configuration: PartialInitializationConfiguration
) => {
    await DdSdkReactNativeVega._initializeFromDatadogProviderWithConfigurationAsync(
        configuration
    );
    if (DatadogProviderVega.onInitialization) {
        DatadogProviderVega.onInitialization();
    }
};
