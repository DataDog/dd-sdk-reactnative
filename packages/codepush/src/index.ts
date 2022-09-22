import {
    DatadogProvider,
    DatadogProviderConfiguration,
    DdSdkReactNative
} from '@datadog/mobile-react-native';
import type { DdSdkReactNativeConfiguration } from '@datadog/mobile-react-native';
import codePush from 'react-native-code-push';

/**
 * Use this class instead of DdSdkReactNative to initialize the Datadog SDK when using AppCenter CodePush.
 */
export const DatadogCodepush = {
    async initialize(
        configuration: DdSdkReactNativeConfiguration
    ): Promise<void> {
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

export const DatadogCodepushProvider: typeof DatadogProvider = ({
    configuration,
    ...rest
}) => {
    // We cannot use SYNC or ASYNC initialization modes as we need to asynchronously get the CodePush version.
    // We turn it to partial initialization, while in parallel we get the CodePush version and initialize the SDK.
    if (configuration instanceof DatadogProviderConfiguration) {
        initializeWithCodepushVersion(configuration);
        const partialConfiguration = {
            trackErrors: configuration.trackErrors,
            trackResources: configuration.trackResources,
            trackInteractions: configuration.trackInteractions,
            firstPartyHosts: configuration.firstPartyHosts,
            resourceTracingSamplingRate:
                configuration.resourceTracingSamplingRate
        };
        return DatadogProvider({
            configuration: partialConfiguration,
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
