/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRumErrorTracking } from '@datadog/mobile-react-native/internal';
import { DdRum as CoreDdRum } from '@datadog/mobile-react-native';

import { DdSdkReactNativeVega } from '../src/DdSdkReactNativeVega';

jest.mock('../src/turbo-modules/NativeDdSdk', () => ({
    __esModule: true,
    default: {}
}));

jest.mock('../src/turbo-modules/NativeDdRum', () => ({
    __esModule: true,
    default: {
        addError: jest.fn(() => Promise.resolve())
    }
}));

describe('DdSdkReactNativeVega error tracking', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (DdSdkReactNativeVega as any).wasAutoInstrumented = false;
    });

    it('starts automatic JavaScript error tracking with the patched core reporter', () => {
        const startTracking = jest
            .spyOn(DdRumErrorTracking, 'startTracking')
            .mockImplementation();

        (DdSdkReactNativeVega as any).enableFeatures({
            rumConfiguration: {
                trackErrors: true,
                trackInteractions: false,
                trackResources: false
            }
        });

        expect(startTracking).toHaveBeenCalledWith(CoreDdRum);
    });

    it('does not start automatic JavaScript error tracking when disabled', () => {
        const startTracking = jest
            .spyOn(DdRumErrorTracking, 'startTracking')
            .mockImplementation();

        (DdSdkReactNativeVega as any).enableFeatures({
            rumConfiguration: {
                trackErrors: false,
                trackInteractions: false,
                trackResources: false
            }
        });

        expect(startTracking).not.toHaveBeenCalled();
    });
});
