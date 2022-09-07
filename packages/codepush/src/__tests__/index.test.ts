import {
    DdSdkReactNative,
    DdSdkReactNativeConfiguration
} from '@datadog/mobile-react-native';
import codePush from 'react-native-code-push';

import { DatadogCodepush } from '..';

jest.mock('react-native-code-push', () => ({
    getUpdateMetadata: jest.fn()
}));

jest.mock('@datadog/mobile-react-native', () => {
    const actualPackage = jest.requireActual('@datadog/mobile-react-native');
    return {
        ...actualPackage,
        DdSdkReactNative: {
            initialize: jest.fn()
        }
    };
});

describe('AppCenter Codepush integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('initialize', () => {
        it('initializes the SDK with the correct version when using a CodePush bundle', async () => {
            (codePush.getUpdateMetadata as jest.MockedFunction<
                typeof codePush.getUpdateMetadata
            >).mockResolvedValueOnce({
                label: 'v3',
                isMandatory: false,
                install: jest.fn(),
                appVersion: '1.0.0',
                deploymentKey: '1',
                description: '1',
                failedInstall: false,
                isFirstRun: false,
                isPending: false,
                packageHash: '1',
                packageSize: 42
            });

            const configuration = new DdSdkReactNativeConfiguration(
                'token',
                'env',
                'appId',
                true,
                true,
                true
            );

            await DatadogCodepush.initialize(configuration);

            expect(DdSdkReactNative.initialize).toHaveBeenCalledTimes(1);
            expect(DdSdkReactNative.initialize).toHaveBeenCalledWith(
                expect.objectContaining({ versionSuffix: 'codepush.v3' })
            );
        });

        it('initializes the SDK with the correct version when not using a CodePush bundle', async () => {
            (codePush.getUpdateMetadata as jest.MockedFunction<
                typeof codePush.getUpdateMetadata
            >).mockResolvedValueOnce(null);

            const configuration = new DdSdkReactNativeConfiguration(
                'token',
                'env',
                'appId',
                true,
                true,
                true
            );

            await DatadogCodepush.initialize(configuration);

            expect(DdSdkReactNative.initialize).toHaveBeenCalledTimes(1);
            expect(
                Object.keys(
                    (DdSdkReactNative.initialize as jest.MockedFunction<
                        typeof DdSdkReactNative.initialize
                    >).mock.calls[0]
                )
            ).not.toContain('versionSuffix');
        });
    });
});
