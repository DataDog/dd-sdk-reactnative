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
    DdRumErrorTracking,
    DdRumResourceTracking
} from '@datadog/mobile-react-native/internal';
import {
    CoreConfiguration,
    ErrorSource,
    DatadogProviderConfiguration,
    DdRum as CoreRum,
    DdLogs as CoreLogs,
    DdSdkReactNative as CoreSdk,
    TrackingConsent,
    RumConfiguration,
    SdkVerbosity
} from '@datadog/mobile-react-native';
// The renderer is shared test tooling declared in the repository root.
// eslint-disable-next-line import/no-extraneous-dependencies
import renderer, { act } from 'react-test-renderer';
import React from 'react';

import { DatadogProvider } from '../src/DatadogProvider';
import { startHttpProxy, isHttpProxyReady } from '../src/HttpProxy';
import { DdSdkReactNative as VegaSdk } from '../src';

// Use the declared provider list so missing native registrations are visible.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockAutolink = require('../react-native.config.js').dependency.platforms
    .kepler.autolink;

const mockRegisteredModules = new Set(
    Object.values(mockAutolink).flatMap((entry: any) => entry.turbomodules)
);

const mockNative = {
    initialize: jest.fn(),
    startHttpProxy: jest.fn(),
    stopHttpProxy: jest.fn(),
    httpResponse: jest.fn(),
    setTrackingConsent: jest.fn(),
    clearAllData: jest.fn()
};
const mockRum = {
    startResource: jest.fn(),
    addAction: jest.fn(),
    addError: jest.fn()
};
const mockLogs = { log: jest.fn() };
jest.mock('@amazon-devices/keplerscript-turbomodule-api', () => ({
    TurboModuleRegistry: {
        get: (name: string) => {
            if (!mockRegisteredModules.has(name)) {
                return null;
            }
            return name === 'DdSdk'
                ? mockNative
                : name === 'DdRum'
                ? mockRum
                : name === 'DeviceInfoModule'
                ? {
                      getConstants: () => ({
                          bundleId: 'example.app',
                          appVersion: '2.1'
                      })
                  }
                : name === 'DdLogs'
                ? mockLogs
                : null;
        }
    }
}));
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => ({
    __esModule: true,
    default: jest.fn(() => ({ addListener: () => ({ remove: jest.fn() }) }))
}));
const flush = () => new Promise(jest.requireActual('timers').setImmediate);
const configuration = () =>
    new CoreConfiguration('test-token', 'test', TrackingConsent.PENDING, {
        rumConfiguration: {
            applicationId: '11111111-1111-4111-8111-111111111111',
            trackErrors: false,
            trackInteractions: false,
            trackResources: false
        }
    });
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
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    Object.values(mockNative).forEach(mock => mock.mockReset());
    mockNative.initialize.mockResolvedValue(true);
    mockNative.startHttpProxy.mockResolvedValue(true);
    mockRum.startResource.mockResolvedValue(undefined);
    mockRum.addAction.mockResolvedValue(undefined);
    mockLogs.log.mockResolvedValue(undefined);
    mockRum.addError.mockResolvedValue(undefined);
    CoreRum.unregisterErrorEventMapper();
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
        TrackingConsent.PENDING,
        {
            rumConfiguration: {
                applicationId: '11111111-1111-4111-8111-111111111111',
                trackErrors: false,
                trackInteractions: false,
                trackResources: false
            }
        }
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

it.each(['transport', 'native', 'rejection'] as const)(
    'contains %s provider failure without retrying on later renders',
    async failure => {
        if (failure === 'transport') {
            mockNative.startHttpProxy.mockResolvedValueOnce(false);
        } else if (failure === 'native') {
            mockNative.initialize.mockResolvedValueOnce(false);
        } else {
            mockNative.initialize.mockRejectedValueOnce(
                new Error('native setup failed')
            );
        }
        const done = jest.fn();
        const child = jest.fn(() => null);
        const config = new DatadogProviderConfiguration(
            'test-token',
            'test',
            TrackingConsent.PENDING,
            {
                rumConfiguration: {
                    applicationId: '11111111-1111-4111-8111-111111111111',
                    trackErrors: false,
                    trackResources: false,
                    trackInteractions: false
                }
            }
        );
        let tree!: renderer.ReactTestRenderer;
        const Child = child;
        await act(async () => {
            tree = renderer.create(
                <DatadogProvider configuration={config} onInitialization={done}>
                    <Child />
                </DatadogProvider>
            );
            await flush();
        });
        expect(child).toHaveBeenCalled();
        expect(done).not.toHaveBeenCalled();
        expect(GlobalState.isInitialized).toBe(false);
        expect(DatadogProviderState.isInitialized).toBe(true);
        await act(async () => {
            tree.update(
                <DatadogProvider configuration={config} onInitialization={done}>
                    <Child />
                </DatadogProvider>
            );
            await flush();
        });
        expect(mockNative.startHttpProxy).toHaveBeenCalledTimes(1);
        expect(mockNative.initialize).toHaveBeenCalledTimes(
            failure === 'transport' ? 0 : 1
        );
        expect(done).not.toHaveBeenCalled();
        expect(GlobalState.isInitialized).toBe(false);
        act(() => tree.unmount());
    }
);

it.each([true, false])(
    'reuses a ready internal proxy when native initialization returns %s',
    async accepted => {
        const cleanup = await startHttpProxy();
        mockNative.initialize.mockResolvedValueOnce(accepted);
        mockNative.startHttpProxy.mockClear();
        const error = jest
            .spyOn(console, 'warn')
            .mockImplementation(() => undefined);
        await VegaSdk.initialize(configuration());
        expect(mockNative.startHttpProxy).not.toHaveBeenCalled();
        expect(mockNative.stopHttpProxy).not.toHaveBeenCalled();
        expect(isHttpProxyReady()).toBe(true);
        cleanup();
        await flush();
        expect(mockNative.stopHttpProxy).toHaveBeenCalledTimes(1);
        expect(isHttpProxyReady()).toBe(false);
        error.mockRestore();
    }
);

it('reports a missing RUM configuration without starting transport or native', async () => {
    const error = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
    const config = new CoreConfiguration('test-token', 'test');
    config.verbosity = SdkVerbosity.WARN;
    await expect(VegaSdk.initialize(config)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
        'DATADOG: Vega SDK initialization requires a RUM or logging configuration'
    );
    expect(mockNative.startHttpProxy).not.toHaveBeenCalled();
    expect(mockNative.initialize).not.toHaveBeenCalled();
    expect(GlobalState.isInitialized).toBe(false);
});

it('stops an initialization-owned proxy after native setup fails', async () => {
    mockNative.initialize.mockResolvedValueOnce(false);
    await VegaSdk.initialize(configuration());
    await flush();
    expect(mockNative.stopHttpProxy).toHaveBeenCalledTimes(1);
    expect(isHttpProxyReady()).toBe(false);
});

it('reports native feature-registration failure for a logging-only configuration', async () => {
    const config = new CoreConfiguration(
        'test-token',
        'test',
        TrackingConsent.PENDING,
        { logsConfiguration: {} }
    );
    config.verbosity = SdkVerbosity.WARN;
    mockNative.initialize.mockResolvedValueOnce(false);
    await expect(VegaSdk.initialize(config)).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
        'DATADOG: Vega native SDK initialization failed; check credentials and configure a supported RUM or logging feature'
    );
    expect(GlobalState.isInitialized).toBe(false);
});

it('keeps failure diagnostics silent when verbosity is unset', async () => {
    const config = new CoreConfiguration('test-token', 'test');
    await expect(VegaSdk.initialize(config)).resolves.toBeUndefined();
    expect(console.warn).not.toHaveBeenCalled();
    expect(GlobalState.isInitialized).toBe(false);
});

it('contains provider callback failures without retrying successful initialization', async () => {
    const config = new DatadogProviderConfiguration(
        'test-token',
        'test',
        TrackingConsent.PENDING,
        {
            rumConfiguration: {
                applicationId: '11111111-1111-4111-8111-111111111111',
                trackErrors: false,
                trackResources: false,
                trackInteractions: false
            }
        }
    );
    const callback = jest.fn(() => {
        throw new Error('callback failed');
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
        tree = renderer.create(
            <DatadogProvider
                configuration={config}
                onInitialization={callback}
            />
        );
        await flush();
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(GlobalState.isInitialized).toBe(true);
    expect(DatadogProviderState.isInitialized).toBe(true);
    act(() => tree.unmount());
});

it('routes shared core logs through the initialized Vega bridge', async () => {
    await VegaSdk.initialize(configuration());
    await CoreLogs.info('shared core log', { value: 42 });
    expect(mockLogs.log).toHaveBeenCalledWith(
        'info',
        'shared core log',
        '',
        '',
        '',
        expect.objectContaining({ value: 42 })
    );
});

it('uses platform metadata during setup without repeating the version suffix', async () => {
    const config = configuration();
    config.versionSuffix = 'beta';
    await VegaSdk.initialize(config);
    expect(mockNative.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
            service: 'example.app',
            additionalConfiguration: expect.objectContaining({
                '_dd.version': '2.1-beta',
                '_dd.sdk_version': expect.any(String)
            })
        })
    );
});

it.each([false, true])(
    'uses shared error tracking when trackErrors=%s',
    async enabled => {
        const start = jest
            .spyOn(DdRumErrorTracking, 'startTracking')
            .mockImplementation(() => undefined);
        const config = configuration();
        config.rumConfiguration = new RumConfiguration(
            'test-app',
            false,
            false,
            enabled
        );
        await VegaSdk.initialize(config);
        expect(start).toHaveBeenCalledTimes(enabled ? 1 : 0);
    }
);

it('keeps error mapping and enrichment on the shared core path', async () => {
    const config = configuration();
    config.rumConfiguration = new RumConfiguration('test-app');
    config.rumConfiguration.errorEventMapper = event => ({
        ...event,
        message: 'mapped error'
    });
    await VegaSdk.initialize(config);
    await CoreRum.addError('original', ErrorSource.SOURCE, 'stack', {});
    expect(mockRum.addError).toHaveBeenCalledWith(
        'mapped error',
        ErrorSource.SOURCE,
        'stack',
        expect.objectContaining({ '_dd.error.source_type': 'react-native' }),
        expect.any(Number),
        ''
    );
});
