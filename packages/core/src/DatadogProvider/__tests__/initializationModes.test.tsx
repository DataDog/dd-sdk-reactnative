import { fireEvent } from '@testing-library/react-native';
import { NativeModules } from 'react-native';

import { InitializationMode } from '../../DdSdkReactNativeConfiguration';
import { DdSdkReactNative } from '../../DdSdkReactNative';
import { TimeProvider } from '../../TimeProvider';
import { DdRumUserInteractionTracking } from '../../rum/instrumentation/DdRumUserInteractionTracking';
import { BufferSingleton } from '../Buffer/BufferSingleton';
import {
    DatadogProvider,
    __internalResetIsInitializedForTesting
} from '../DatadogProvider';

import {
    getDefaultConfiguration,
    mockAnimation,
    renderWithProvider,
    renderWithProviderAndAnimation
} from './__utils__/renderWithProvider';

jest.mock('../../TimeProvider', () => {
    const now = jest.fn();
    return {
        TimeProvider: jest.fn().mockImplementation(() => {
            return { now };
        })
    };
});
const nowMock = new TimeProvider().now;

const flushPromises = () => new Promise<void>(setImmediate);

describe('DatadogProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        DdSdkReactNative['wasInitialized'] = false;
        DdSdkReactNative['wasAutoInstrumented'] = false;
        __internalResetIsInitializedForTesting();
        BufferSingleton.reset();
        DdRumUserInteractionTracking.stopTracking();
        (nowMock as any).mockReturnValue('timestamp_not_specified');
    });

    describe('initializationMode SYNC', () => {
        it('starts auto-instrumentation', async () => {
            const { getByText } = renderWithProvider();
            await flushPromises();

            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledTimes(1);

            const button = getByText('test button');
            fireEvent(button, 'press', {
                _targetInst: {
                    props: {
                        'dd-action-name': 'press button'
                    }
                }
            });

            expect(NativeModules.DdRum.addAction).toHaveBeenCalledTimes(1);
        });
        it('initializes the SDK before animations are done', async () => {
            const { finishAnimation } = mockAnimation();
            renderWithProvider();

            await flushPromises();
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledTimes(1);
            finishAnimation();
        });
    });

    describe('initializationMode ASYNC', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });
        afterEach(() => {
            jest.useRealTimers();
        });
        it('starts auto-instrumentation after animations are done (with real Animation)', async () => {
            const configuration = getDefaultConfiguration();
            configuration.initializationMode = InitializationMode.ASYNC;

            const { getByText } = renderWithProviderAndAnimation({
                configuration
            });
            await flushPromises();
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledTimes(0);
            jest.advanceTimersByTime(700);
            await flushPromises();
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledTimes(1);
            const button = getByText('test button');
            fireEvent(button, 'press', {
                _targetInst: {
                    props: {
                        'dd-action-name': 'press button'
                    }
                }
            });
            expect(NativeModules.DdRum.addAction).toHaveBeenCalledTimes(1);
        });

        it('starts auto-instrumentation after animations are done (with InteractionManager)', async () => {
            const configuration = getDefaultConfiguration();
            configuration.initializationMode = InitializationMode.ASYNC;

            const { finishAnimation } = mockAnimation();
            const { getByText } = renderWithProvider({ configuration });

            await flushPromises();
            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledTimes(0);

            finishAnimation();
            await flushPromises();

            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledTimes(1);
            const button = getByText('test button');
            fireEvent(button, 'press', {
                _targetInst: {
                    props: {
                        'dd-action-name': 'press button'
                    }
                }
            });
            expect(NativeModules.DdRum.addAction).toHaveBeenCalledTimes(1);
        });
    });

    describe('partial initialization', () => {
        it('does not start reporting auto-instrumentation', async () => {
            const { getByText } = renderWithProvider({
                configuration: {
                    trackErrors: true,
                    trackResources: true,
                    trackInteractions: true,
                    firstPartyHosts: ['api.com'],
                    resourceTracingSamplingRate: 100
                }
            });
            await flushPromises();

            const button = getByText('test button');
            fireEvent(button, 'press', {
                _targetInst: {
                    props: {
                        'dd-action-name': 'press button'
                    }
                }
            });

            expect(NativeModules.DdSdk.initialize).not.toHaveBeenCalled();
            expect(NativeModules.DdRum.addAction).not.toHaveBeenCalled();

            await DatadogProvider.initialize({
                applicationId: 'fake-application-id',
                clientToken: 'fake-client-token',
                env: 'fake-env'
            });
            await flushPromises();

            expect(NativeModules.DdSdk.initialize).toHaveBeenCalledTimes(1);
            expect(
                NativeModules.DdSdk.initialize.mock.calls[0][0]
                    .additionalConfig['_dd.first_party_hosts']
            ).toEqual(['api.com']);
            expect(NativeModules.DdRum.addAction).toHaveBeenCalledTimes(1);
        });
    });
});
