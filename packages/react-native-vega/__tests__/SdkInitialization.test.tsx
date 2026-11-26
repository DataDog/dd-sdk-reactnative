/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    BufferSingleton,
    DatadogProviderState,
    GlobalState,
    getGlobalInstance,
    registerNativeModuleOverrides,
    DdRumResourceTracking
} from '@datadog/mobile-react-native/internal';
import {
    CoreConfiguration,
    DatadogProviderConfiguration,
    DdRum as CoreRum,
    DdSdkReactNative as CoreSdk,
    TrackingConsent,
    RumConfiguration
} from '@datadog/mobile-react-native';
// The renderer is shared test tooling declared in the repository root.
// eslint-disable-next-line import/no-extraneous-dependencies
import renderer, { act } from 'react-test-renderer';
import React from 'react';

import { DatadogProvider } from '../src/DatadogProvider';
import { VegaSdk } from '../src/SdkInitialization';

const mockNative = {
    initialize: jest.fn(),
    startHttpProxy: jest.fn(),
    stopHttpProxy: jest.fn(),
    httpResponse: jest.fn(),
    setTrackingConsent: jest.fn(),
    clearAllData: jest.fn()
};
const mockRum = { startResource: jest.fn(), addAction: jest.fn() };
jest.mock('@amazon-devices/keplerscript-turbomodule-api', () => ({
    TurboModuleRegistry: {
        get: (name: string) =>
            name === 'DdSdk' ? mockNative : name === 'DdRum' ? mockRum : null
    }
}));
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => ({
    __esModule: true,
    default: jest.fn(() => ({ addListener: () => ({ remove: jest.fn() }) }))
}));
const flush = () => new Promise(jest.requireActual('timers').setImmediate);
const configuration = () =>
    new CoreConfiguration('test-token', 'test', TrackingConsent.PENDING);
const lifecycle = getGlobalInstance<{ initialization?: Promise<void> }>(
    'com.datadog.reactnative.vega.initialization',
    () => ({})
);
const transport = getGlobalInstance<{ activeCleanup?: () => void }>(
    'com.datadog.reactnative.vega.http_proxy',
    () => ({})
);

beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockNative).forEach(mock => mock.mockReset());
    mockNative.initialize.mockResolvedValue(true);
    mockNative.startHttpProxy.mockResolvedValue(true);
    mockRum.startResource.mockResolvedValue(undefined);
    mockRum.addAction.mockResolvedValue(undefined);
    lifecycle.initialization = undefined;
    GlobalState.isInitialized = false;
    CoreSdk['wasAutoInstrumented'] = false;
    CoreSdk['features'] = undefined;
    DatadogProviderState._reset();
    BufferSingleton.reset();
});
afterEach(async () => {
    transport.activeCleanup?.();
    await flush();
    registerNativeModuleOverrides({});
    jest.restoreAllMocks();
});

it('waits for the transport before native initialization and keeps shared configuration', async () => {
    let ready!: (value: boolean) => void;
    mockNative.startHttpProxy.mockReturnValue(
        new Promise(resolve => {
            ready = resolve;
        })
    );
    const config = configuration();
    config.service = 'custom';
    config.version = '2.1';
    config.versionSuffix = 'beta';
    const result = VegaSdk.initialize(config);
    await flush();
    expect(mockNative.initialize).not.toHaveBeenCalled();
    ready(true);
    await result;
    expect(mockNative.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
            clientToken: 'test-token',
            env: 'test',
            service: 'custom',
            trackingConsent: 'pending',
            additionalConfiguration: expect.objectContaining({
                '_dd.version': '2.1-beta',
                '_dd.source': 'react-native'
            })
        })
    );
    expect(GlobalState.isInitialized).toBe(true);
    await VegaSdk.initialize(config);
    expect(mockNative.initialize).toHaveBeenCalledTimes(1);
});

it.each(['transport', 'native'] as const)(
    'allows retry after %s setup fails without throwing into the app',
    async failure => {
        if (failure === 'transport') {
            mockNative.startHttpProxy.mockResolvedValueOnce(false);
        } else {
            mockNative.initialize.mockResolvedValueOnce(false);
        }
        await expect(
            VegaSdk.initialize(configuration())
        ).resolves.toBeUndefined();
        expect(GlobalState.isInitialized).toBe(false);
        await VegaSdk.initialize(configuration());
        expect(GlobalState.isInitialized).toBe(true);
    }
);

it('routes core instrumentation through Kepler and converts the action signature', async () => {
    await VegaSdk.initialize(configuration());
    await CoreRum.startResource(
        'request',
        'GET',
        'https://example.com',
        {},
        42
    );
    await CoreRum.addAction('CUSTOM', 'action', {}, 43);
    expect(mockRum.startResource).toHaveBeenCalledWith(
        'request',
        'GET',
        'https://example.com',
        {},
        42
    );
    expect(mockRum.addAction).toHaveBeenCalledWith('CUSTOM', 'action', {}, 43);
    await VegaSdk.setTrackingConsent(TrackingConsent.GRANTED);
    await VegaSdk.clearAllData();
    expect(mockNative.setTrackingConsent).toHaveBeenCalledWith('granted');
    expect(mockNative.clearAllData).toHaveBeenCalledTimes(1);
});

it('supports provider setup and waits before calling onInitialization', async () => {
    const done = jest.fn();
    const config = new DatadogProviderConfiguration(
        'test-token',
        'test',
        TrackingConsent.PENDING
    );
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
        tree = renderer.create(
            <DatadogProvider configuration={config} onInitialization={done}>
                <React.Fragment />
            </DatadogProvider>
        );
        await flush();
    });
    expect(mockNative.initialize).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledTimes(1);
    act(() => tree.unmount());
});

it('supports deferred provider setup', async () => {
    const done = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
        tree = renderer.create(
            <DatadogProvider
                configuration={{
                    rumConfiguration: {
                        trackResources: false,
                        trackInteractions: false,
                        trackErrors: false
                    },
                    logsConfiguration: {}
                }}
                onInitialization={done}
            >
                <React.Fragment />
            </DatadogProvider>
        );
        await flush();
    });
    expect(mockNative.initialize).not.toHaveBeenCalled();
    await act(async () => {
        await DatadogProvider.initialize({
            clientToken: 'test-token',
            env: 'test',
            rumConfiguration: { applicationId: 'test-app' }
        });
    });
    expect(mockNative.initialize).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledTimes(1);
    act(() => tree.unmount());
});

it('keeps resource tracking options on the shared instrumentation path', async () => {
    const start = jest
        .spyOn(DdRumResourceTracking, 'startTracking')
        .mockImplementation(() => undefined);
    const config = configuration();
    config.rumConfiguration = new RumConfiguration(
        'test-app',
        false,
        true,
        false
    );
    config.rumConfiguration.resourceTraceSampleRate = 23;
    config.rumConfiguration.trackFetchResources = true;
    await VegaSdk.initialize(config);
    expect(start).toHaveBeenCalledWith(
        expect.objectContaining({
            resourceTraceSampleRate: 23,
            trackFetchResources: true
        })
    );
});

it('retries provider setup after failure and calls the callback only on success', async () => {
    mockNative.initialize.mockResolvedValueOnce(false);
    const done = jest.fn();
    const config = new DatadogProviderConfiguration(
        'test-token',
        'test',
        TrackingConsent.PENDING
    );
    const component = (
        <DatadogProvider configuration={config} onInitialization={done} />
    );
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
        tree = renderer.create(component);
        await flush();
    });
    expect(done).not.toHaveBeenCalled();
    expect(DatadogProviderState.isInitialized).toBe(false);
    await act(async () => {
        tree.update(
            <DatadogProvider configuration={config} onInitialization={done} />
        );
        await flush();
    });
    expect(done).toHaveBeenCalledTimes(1);
    expect(mockNative.initialize).toHaveBeenCalledTimes(2);
    act(() => tree.unmount());
});
