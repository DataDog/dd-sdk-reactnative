/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import {
    DatadogProvider,
    DatadogProviderConfiguration,
    DdSdkReactNative
} from '@datadog/mobile-react-native';
import type {
    AutoInstrumentationConfiguration,
    CoreSDKConfiguration
} from '@datadog/mobile-react-native';
import codePush from 'react-native-code-push';

import { DISCARD_PROPERTY, removeDiscardProperties } from './utils';
import type { RequiredOrDiscard } from './utils';

/**
 * Use this class instead of DdSdkReactNative to initialize the Datadog SDK when using AppCenter CodePush.
 */
export const DatadogCodepush = {
    async initialize(configuration: CoreSDKConfiguration): Promise<void> {
        const codePushUpdateMetadata = await codePush.getUpdateMetadata();
        if (codePushUpdateMetadata) {
            configuration.versionSuffix = `codepush.${codePushUpdateMetadata.label}`;
        }
        return DdSdkReactNative.initialize(configuration);
    }
};

const initializeWithCodepushVersion = async (
    configuration: DatadogProviderConfiguration
) => {
    const codePushUpdateMetadata = await codePush.getUpdateMetadata();
    if (codePushUpdateMetadata) {
        configuration.versionSuffix = `codepush.${codePushUpdateMetadata.label}`;
    }
    DatadogProvider.initialize(configuration);
};

const buildPartialConfiguration = (
    configuration: DatadogProviderConfiguration
): AutoInstrumentationConfiguration => {
    const partialConfiguration: RequiredOrDiscard<AutoInstrumentationConfiguration> = {
        trackErrors: configuration.trackErrors,
        trackResources: configuration.trackResources,
        trackInteractions: configuration.trackInteractions,
        firstPartyHosts: configuration.firstPartyHosts,
        logEventMapper: configuration.logEventMapper,
        errorEventMapper: configuration.errorEventMapper,
        resourceEventMapper: configuration.resourceEventMapper,
        actionEventMapper: configuration.actionEventMapper,
        useAccessibilityLabel: configuration.useAccessibilityLabel,
        resourceTracingSamplingRate: configuration.resourceTracingSamplingRate,
        actionNameAttribute:
            configuration.actionNameAttribute ?? DISCARD_PROPERTY
    };

    return removeDiscardProperties(
        partialConfiguration
    ) as AutoInstrumentationConfiguration;
};

export const DatadogCodepushProvider: typeof DatadogProvider = ({
    configuration,
    ...rest
}) => {
    // We cannot use SYNC or ASYNC initialization modes as we need to asynchronously get the CodePush version.
    // We turn it to partial initialization, while in parallel we get the CodePush version and initialize the SDK.
    if (configuration instanceof DatadogProviderConfiguration) {
        initializeWithCodepushVersion(configuration);
        return DatadogProvider({
            configuration: buildPartialConfiguration(configuration),
            ...rest
        });
    } else {
        return DatadogProvider({ configuration, ...rest });
    }
};

DatadogCodepushProvider.initialize = async configuration => {
    const codePushUpdateMetadata = await codePush.getUpdateMetadata();
    if (codePushUpdateMetadata) {
        configuration.versionSuffix = `codepush.${codePushUpdateMetadata.label}`;
    }
    DatadogProvider.initialize(configuration);
};
