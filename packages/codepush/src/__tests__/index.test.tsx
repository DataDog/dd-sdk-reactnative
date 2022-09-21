import { DatadogProviderConfiguration } from '@datadog/mobile-react-native/src/DdSdkReactNativeConfiguration';
import {
    DdSdkReactNative,
    DdSdkReactNativeConfiguration
} from '@datadog/mobile-react-native';
import { render } from '@testing-library/react-native';
import codePush from 'react-native-code-push';
import React from 'react';

import { DatadogCodepush, DatadogCodepushProvider } from '..';

jest.mock('react-native-code-push', () => ({
    getUpdateMetadata: jest.fn()
}));

jest.mock('@datadog/mobile-react-native', () => {
    const actualPackage = jest.requireActual('@datadog/mobile-react-native');
    actualPackage.DdSdkReactNative.initialize = jest.fn();
    actualPackage.DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync = jest.fn();
    return actualPackage;
});

const flushPromises = () => new Promise(setImmediate);

const createCodepushPackageMock = label => ({
    label,
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

describe('AppCenter Codepush integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('initialize', () => {
        it('initializes the SDK with the correct version when using a CodePush bundle', async () => {
            (codePush.getUpdateMetadata as jest.MockedFunction<
                typeof codePush.getUpdateMetadata
            >).mockResolvedValueOnce(createCodepushPackageMock('v3'));

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

    describe('DatadogCodepushProvider', () => {
        it('initializes the sdk with the right codepush version when using DatadogProviderConfiguration', async () => {
            (codePush.getUpdateMetadata as jest.MockedFunction<
                typeof codePush.getUpdateMetadata
            >).mockResolvedValueOnce(createCodepushPackageMock('v4'));

            const configuration = new DatadogProviderConfiguration(
                'token',
                'env',
                'appId',
                true,
                true,
                true
            );
            render(<DatadogCodepushProvider configuration={configuration} />);
            await flushPromises();

            expect(
                DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync
            ).toHaveBeenCalledTimes(1);
            expect(
                DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync
            ).toHaveBeenCalledWith(
                expect.objectContaining({ versionSuffix: 'codepush.v4' })
            );
        });
        it('initializes the sdk with the right codepush version when using partial configuration', async () => {
            (codePush.getUpdateMetadata as jest.MockedFunction<
                typeof codePush.getUpdateMetadata
            >).mockResolvedValueOnce(createCodepushPackageMock('v5'));

            const configuration = {
                trackErrors: true,
                trackInteractions: true,
                trackResources: true
            };
            render(<DatadogCodepushProvider configuration={configuration} />);
            await flushPromises();
            expect(
                DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync
            ).not.toHaveBeenCalled();

            DatadogCodepushProvider.initialize({
                applicationId: 'fake-application-id',
                clientToken: 'fake-client-token',
                env: 'fake-env'
            });
            await flushPromises();

            expect(
                DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync
            ).toHaveBeenCalledTimes(1);
            expect(
                DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync
            ).toHaveBeenCalledWith(
                expect.objectContaining({ versionSuffix: 'codepush.v5' })
            );
        });
        it('initializes the sdk with commercial version when using DatadogProviderConfiguration', async () => {
            (codePush.getUpdateMetadata as jest.MockedFunction<
                typeof codePush.getUpdateMetadata
            >).mockResolvedValueOnce(createCodepushPackageMock(null));

            const configuration = new DatadogProviderConfiguration(
                'token',
                'env',
                'appId',
                true,
                true,
                true
            );
            render(<DatadogCodepushProvider configuration={configuration} />);
            await flushPromises();

            expect(
                DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync
            ).toHaveBeenCalledTimes(1);
            expect(
                Object.keys(
                    (DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync as jest.MockedFunction<
                        typeof DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync
                    >).mock.calls[0]
                )
            ).not.toContain('versionSuffix');
        });
        it('initializes the sdk with commercial version when using partial configuration', async () => {
            (codePush.getUpdateMetadata as jest.MockedFunction<
                typeof codePush.getUpdateMetadata
            >).mockResolvedValueOnce(createCodepushPackageMock(null));

            const configuration = {
                trackErrors: true,
                trackInteractions: true,
                trackResources: true
            };
            render(<DatadogCodepushProvider configuration={configuration} />);
            await flushPromises();
            expect(
                DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync
            ).not.toHaveBeenCalled();

            DatadogCodepushProvider.initialize({
                applicationId: 'fake-application-id',
                clientToken: 'fake-client-token',
                env: 'fake-env'
            });
            await flushPromises();

            expect(
                DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync
            ).toHaveBeenCalledTimes(1);
            expect(
                Object.keys(
                    (DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync as jest.MockedFunction<
                        typeof DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync
                    >).mock.calls[0]
                )
            ).not.toContain('versionSuffix');
        });
    });
});
