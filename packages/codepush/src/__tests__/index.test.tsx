/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('react-native-code-push', () => ({
    getUpdateMetadata: jest.fn()
}));

jest.mock('@datadog/mobile-react-native', () => {
    const actualPackage = jest.requireActual('@datadog/mobile-react-native');
    actualPackage.DdSdkReactNative.initialize = jest.fn();
    actualPackage.DdSdkReactNative._enableFeaturesFromDatadogProvider = jest.fn();
    actualPackage.DdSdkReactNative._enableFeaturesFromDatadogProviderAsync = jest.fn();
    actualPackage.DdSdkReactNative._initializeFromDatadogProviderWithConfigurationAsync = jest.fn();
    actualPackage.DdSdkReactNative._initializeFromDatadogProvider = jest.fn();
    return actualPackage;
});

const flushPromises = () =>
    new Promise(jest.requireActual('timers').setImmediate);

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
        const _globalThis = (globalThis as unknown) as Record<
            PropertyKey,
            unknown
        >;
        const providerState = _globalThis[
            Symbol.for('com.datadog.reactnative.rum.datadog_provider_state')
        ] as
            | {
                  _reset: () => void;
              }
            | undefined;
        providerState?._reset();
    });

    describe('initialize', () => {
        it('initializes the SDK with the correct version when using a CodePush bundle', async () => {
            const codePush = require('react-native-code-push');
            const { DatadogCodepush } = require('..');
            const {
                CoreConfiguration,
                RumConfiguration,
                DdSdkReactNative
            } = require('@datadog/mobile-react-native');

            (codePush.getUpdateMetadata as jest.MockedFunction<
                typeof codePush.getUpdateMetadata
            >).mockResolvedValueOnce(createCodepushPackageMock('v3'));

            const configuration = new CoreConfiguration('token', 'env');
            configuration.rumConfiguration = new RumConfiguration(
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
            const codePush = require('react-native-code-push');
            const { DatadogCodepush } = require('..');
            const {
                CoreConfiguration,
                RumConfiguration,
                DdSdkReactNative
            } = require('@datadog/mobile-react-native');

            (codePush.getUpdateMetadata as jest.MockedFunction<
                typeof codePush.getUpdateMetadata
            >).mockResolvedValueOnce(null);

            const configuration = new CoreConfiguration('token', 'env');
            configuration.rumConfiguration = new RumConfiguration(
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
        beforeEach(() => {
            jest.clearAllMocks();
            jest.resetModules();
        });

        it('initializes the sdk with the right codepush version when using DatadogProviderConfiguration', async () => {
            const codePush = require('react-native-code-push');
            const { DatadogCodepushProvider } = require('..');
            const {
                DatadogProviderConfiguration,
                RumConfiguration,
                DdSdkReactNative
            } = require('@datadog/mobile-react-native');

            (codePush.getUpdateMetadata as jest.MockedFunction<
                typeof codePush.getUpdateMetadata
            >).mockResolvedValueOnce(createCodepushPackageMock('v4'));

            const configuration = new DatadogProviderConfiguration(
                'token',
                'env'
            );
            configuration.rumConfiguration = new RumConfiguration(
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
            const codePush = require('react-native-code-push');
            const { DatadogCodepushProvider } = require('..');
            const {
                DdSdkReactNative
            } = require('@datadog/mobile-react-native');

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
            const codePush = require('react-native-code-push');
            const { DatadogCodepushProvider } = require('..');
            const {
                DatadogProviderConfiguration,
                RumConfiguration,
                DdSdkReactNative
            } = require('@datadog/mobile-react-native');

            (codePush.getUpdateMetadata as jest.MockedFunction<
                typeof codePush.getUpdateMetadata
            >).mockResolvedValueOnce(createCodepushPackageMock(null));

            const configuration = new DatadogProviderConfiguration(
                'token',
                'env'
            );

            configuration.rumConfiguration = new RumConfiguration(
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
            const codePush = require('react-native-code-push');
            const { DatadogCodepushProvider } = require('..');
            const {
                DdSdkReactNative
            } = require('@datadog/mobile-react-native');

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
                clientToken: 'fake-client-token',
                env: 'fake-env',
                rumConfiguration: {
                    applicationId: 'fake-application-id'
                }
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

        it('initializes the DatadogProvider with FileBasedConfiguration & all parameters', async () => {
            const { DatadogCodepushProvider } = require('..');
            const {
                DdSdkReactNative,
                PropagatorType,
                FileBasedConfiguration
            } = require('@datadog/mobile-react-native');

            const autoInstrumentationConfig = {
                rumConfiguration: {
                    useAccessibilityLabel: true,
                    actionNameAttribute: 'test-action-name-attr',
                    trackErrors: true,
                    trackResources: true,
                    trackInteractions: true,
                    resourceTraceSampleRate: 100
                },
                firstPartyHosts: [
                    {
                        match: 'example.com',
                        propagatorTypes: [PropagatorType.DATADOG]
                    }
                ],
                logsConfiguration: {},
                traceConfiguration: {}
            };

            const configuration = new FileBasedConfiguration({
                configuration: autoInstrumentationConfig
            });

            render(<DatadogCodepushProvider configuration={configuration} />);

            await flushPromises();
            await waitFor(() => {
                expect(
                    DdSdkReactNative._enableFeaturesFromDatadogProvider
                ).toHaveBeenCalledTimes(1);
            });
            expect(
                DdSdkReactNative._enableFeaturesFromDatadogProvider
            ).toHaveBeenCalledWith({
                rumConfiguration: {
                    useAccessibilityLabel: true,
                    actionNameAttribute: 'test-action-name-attr',
                    actionEventMapper: null,
                    resourceEventMapper: null,
                    errorEventMapper: null,
                    trackErrors: true,
                    trackResources: true,
                    trackInteractions: true,
                    resourceTraceSampleRate: 100
                },
                logsConfiguration: {
                    logEventMapper: null
                },
                traceConfiguration: {},
                firstPartyHosts: [
                    {
                        match: 'example.com',
                        propagatorTypes: [PropagatorType.DATADOG]
                    }
                ]
            });

            expect(
                DdSdkReactNative._enableFeaturesFromDatadogProvider
            ).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    clientToken: expect.anything(),
                    env: expect.anything(),
                    applicationId: expect.anything()
                })
            );
        });

        it('initializes the DatadogProvider with FileBasedConfiguration & undefined parameters', async () => {
            const { DatadogCodepushProvider } = require('..');
            const {
                DdSdkReactNative,
                PropagatorType,
                FileBasedConfiguration
            } = require('@datadog/mobile-react-native');

            const autoInstrumentationConfig = {
                rumConfiguration: {
                    useAccessibilityLabel: true,
                    actionNameAttribute: 'test-action-name-attr',
                    trackErrors: true,
                    trackResources: true,
                    trackInteractions: true,
                    resourceTraceSampleRate: 100
                },
                logsConfiguration: {},
                firstPartyHosts: [
                    {
                        match: 'example.com',
                        propagatorTypes: [PropagatorType.DATADOG]
                    }
                ],
                traceConfiguration: {}
            };

            const configuration = new FileBasedConfiguration({
                configuration: autoInstrumentationConfig
            });

            render(<DatadogCodepushProvider configuration={configuration} />);

            await flushPromises();
            await waitFor(() => {
                expect(
                    DdSdkReactNative._enableFeaturesFromDatadogProvider
                ).toHaveBeenCalledTimes(1);
            });
            expect(
                DdSdkReactNative._enableFeaturesFromDatadogProvider
            ).toHaveBeenCalledWith({
                rumConfiguration: {
                    useAccessibilityLabel: true,
                    actionNameAttribute: 'test-action-name-attr',
                    trackErrors: true,
                    trackResources: true,
                    trackInteractions: true,
                    actionEventMapper: null,
                    resourceEventMapper: null,
                    errorEventMapper: null,
                    resourceTraceSampleRate: 100
                },
                logsConfiguration: {
                    logEventMapper: null
                },
                firstPartyHosts: [
                    {
                        match: 'example.com',
                        propagatorTypes: [PropagatorType.DATADOG]
                    }
                ],
                traceConfiguration: {}
            });

            expect(
                DdSdkReactNative._enableFeaturesFromDatadogProvider
            ).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    clientToken: expect.anything(),
                    env: expect.anything(),
                    applicationId: expect.anything()
                })
            );
        });
    });
});
