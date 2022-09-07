import { DdSdkReactNative } from '@datadog/mobile-react-native';
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
