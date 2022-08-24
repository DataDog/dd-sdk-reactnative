import { fireEvent } from '@testing-library/react-native';
import { NativeModules } from 'react-native';

import { InitializationMode } from '../../DdSdkReactNativeConfiguration';
import { DdSdkReactNative } from '../../DdSdkReactNative';
import { TimeProvider } from '../../TimeProvider';
import { DdRumUserInteractionTracking } from '../../rum/instrumentation/DdRumUserInteractionTracking';
import { BufferSingleton } from '../Buffer/BufferSingleton';

import {
    defaultConfiguration,
    renderWithProvider
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
    afterEach(() => {
        jest.clearAllMocks();
        DdSdkReactNative['wasInitialized'] = false;
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
    });

    describe('initializationMode SKIP', () => {
        it('does not start auto-instrumentation', async () => {
            const { getByText } = renderWithProvider({
                configuration: {
                    ...defaultConfiguration,
                    initializationMode: InitializationMode.SKIP
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
        });
    });
});
