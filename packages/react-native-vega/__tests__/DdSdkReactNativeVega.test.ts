/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    getBundleId,
    getVersion
} from '@amazon-devices/react-native-device-info';
import {
    DdRumErrorTracking,
    GlobalState,
    version as sdkVersion
} from '@datadog/mobile-react-native/internal';
import {
    CoreConfiguration,
    DdRum as CoreDdRum
} from '@datadog/mobile-react-native';

import { DdSdkReactNativeVega } from '../src/DdSdkReactNativeVega';
import NativeDdSdk from '../src/turbo-modules/NativeDdSdk';

jest.mock('../src/HttpProxy', () => ({ startHttpProxy: jest.fn() }));
jest.mock(
    '@amazon-devices/react-native-device-info',
    () => ({
        getBundleId: jest.fn(() => 'com.example.vega'),
        getVersion: jest.fn()
    }),
    { virtual: true }
);

jest.mock('../src/turbo-modules/NativeDdSdk', () => ({
    __esModule: true,
    default: {
        initialize: jest.fn(() => Promise.resolve())
    }
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

describe('DdSdkReactNativeVega configuration', () => {
    const createConfiguration = () =>
        new CoreConfiguration('client-token', 'test', undefined, {
            rumConfiguration: {
                applicationId: 'application-id',
                trackInteractions: false,
                trackResources: false,
                trackErrors: false
            }
        });

    beforeEach(() => {
        jest.clearAllMocks();
        (getBundleId as jest.Mock)
            .mockReset()
            .mockReturnValue('com.example.vega');
        (getVersion as jest.Mock).mockReset().mockReturnValue('0.1.0');
        GlobalState.isInitialized = false;
        (DdSdkReactNativeVega as any).wasAutoInstrumented = false;
    });

    afterEach(() => {
        GlobalState.isInitialized = false;
    });

    it.each([undefined, ''])(
        'defaults service to the host application identifier when service is %j',
        async service => {
            const configuration = createConfiguration();
            configuration.service = service;

            await DdSdkReactNativeVega.initialize(configuration);

            expect(NativeDdSdk.initialize).toHaveBeenCalledWith(
                expect.objectContaining({ service: 'com.example.vega' })
            );
            expect(configuration.service).toBe(service);
        }
    );

    it('preserves an explicit service without looking up the application identifier', async () => {
        const configuration = createConfiguration();
        configuration.service = 'custom-service';

        await DdSdkReactNativeVega.initialize(configuration);

        expect(NativeDdSdk.initialize).toHaveBeenCalledWith(
            expect.objectContaining({ service: 'custom-service' })
        );
        expect(getBundleId).not.toHaveBeenCalled();
    });

    it.each(['', '   ', 'unknown', undefined, null])(
        'uses the platform service fallback when the application identifier is %j',
        async applicationId => {
            (getBundleId as jest.Mock).mockReturnValue(applicationId);

            await DdSdkReactNativeVega.initialize(createConfiguration());

            expect(NativeDdSdk.initialize).toHaveBeenCalledWith(
                expect.objectContaining({ service: 'vega' })
            );
        }
    );

    it('initializes with the platform service fallback when identifier lookup throws', async () => {
        (getBundleId as jest.Mock).mockImplementation(() => {
            throw new Error('DeviceInfoModule is unavailable');
        });

        await expect(
            DdSdkReactNativeVega.initialize(createConfiguration())
        ).resolves.toBeUndefined();
        expect(NativeDdSdk.initialize).toHaveBeenCalledWith(
            expect.objectContaining({ service: 'vega' })
        );
    });

    it.each([
        { version: '1.2.3', versionSuffix: undefined, expected: '1.2.3' },
        {
            version: '1.2.3',
            versionSuffix: 'preview',
            expected: '1.2.3-preview'
        },
        { version: undefined, versionSuffix: undefined, expected: '0.1.0' },
        {
            version: undefined,
            versionSuffix: 'preview',
            expected: '0.1.0-preview'
        }
    ])(
        'passes RN version metadata to native initialization: %j',
        async ({ version, versionSuffix, expected }) => {
            const configuration = createConfiguration();
            configuration.version = version;
            configuration.versionSuffix = versionSuffix;

            await DdSdkReactNativeVega.initialize(configuration);

            const nativeConfiguration = (NativeDdSdk.initialize as jest.Mock)
                .mock.calls[0][0];
            expect(nativeConfiguration.additionalConfiguration).toEqual(
                expect.objectContaining({ '_dd.sdk_version': sdkVersion })
            );
            expect(
                nativeConfiguration.additionalConfiguration['_dd.version']
            ).toBe(expected);
            expect(
                nativeConfiguration.additionalConfiguration[
                    '_dd.version_suffix'
                ]
            ).toBeUndefined();
            expect(nativeConfiguration).not.toHaveProperty('version');
            expect(configuration.version).toBe(version);
            expect(getVersion).toHaveBeenCalledTimes(version ? 0 : 1);
        }
    );

    it.each(['', '   ', 'unknown', undefined, null])(
        'does not report an unavailable package version: %j',
        async unavailableVersion => {
            (getVersion as jest.Mock).mockReturnValue(unavailableVersion);
            await DdSdkReactNativeVega.initialize(createConfiguration());

            const nativeConfiguration = (NativeDdSdk.initialize as jest.Mock)
                .mock.calls[0][0];
            expect(
                nativeConfiguration.additionalConfiguration['_dd.version']
            ).toBeUndefined();
            expect(
                nativeConfiguration.additionalConfiguration['_dd.sdk_version']
            ).toBe(sdkVersion);
        }
    );

    it('initializes when the system version lookup fails', async () => {
        (getVersion as jest.Mock).mockImplementation(() => {
            throw new Error('DeviceInfoModule is unavailable');
        });

        await expect(
            DdSdkReactNativeVega.initialize(createConfiguration())
        ).resolves.toBeUndefined();
        expect(NativeDdSdk.initialize).toHaveBeenCalledTimes(1);
    });

    it('clears a previously separate suffix after resolving the package version', async () => {
        const configuration = createConfiguration();
        configuration.versionSuffix = 'preview';
        configuration.additionalConfiguration = {
            '_dd.version_suffix': '-preview'
        };

        await DdSdkReactNativeVega.initialize(configuration);

        const nativeConfiguration = (NativeDdSdk.initialize as jest.Mock).mock
            .calls[0][0];
        expect(nativeConfiguration.additionalConfiguration['_dd.version']).toBe(
            '0.1.0-preview'
        );
        expect(
            nativeConfiguration.additionalConfiguration['_dd.version_suffix']
        ).toBeUndefined();
    });
});
