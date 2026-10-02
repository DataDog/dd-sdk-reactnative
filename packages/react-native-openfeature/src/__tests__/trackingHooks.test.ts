/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    EvaluationDetails,
    FlagValue,
    Hook,
    HookContext
} from '@openfeature/web-sdk';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import {
    composeDatadogTrackingHooks,
    createDatadogEvaluationLoggingHook,
    createDatadogExposureLoggingHook,
    createDatadogRumTrackingHook
} from '../rules-based';
import type { DatadogTrackingHooksOptions } from '../rules-based';
import {
    buildIntakeHost,
    computeBytesCount,
    startIntakeBatch
} from '../tracking/transport';

const mockAddFeatureFlagEvaluation = jest.fn((_name: string, _value: unknown) =>
    Promise.resolve()
);

jest.mock('@datadog/mobile-react-native', () => ({
    DdRum: {
        addFeatureFlagEvaluation: (name: string, value: unknown) =>
            mockAddFeatureFlagEvaluation(name, value)
    }
}));

const options: DatadogTrackingHooksOptions = {
    clientToken: 'client-token',
    site: 'datadoghq.com',
    service: 'shop',
    applicationId: 'app-id'
};

const hookContext = (context: Record<string, unknown>): HookContext =>
    (({ context } as unknown) as HookContext);

const loggedDetails = (
    overrides: Partial<EvaluationDetails<FlagValue>> = {}
): EvaluationDetails<FlagValue> => ({
    flagKey: 'flag',
    value: true,
    variant: 'on',
    reason: 'TARGETING_MATCH',
    flagMetadata: { allocationKey: 'allocation', doLog: true },
    ...overrides
});

const runAfter = (
    hooks: Hook[],
    details: EvaluationDetails<FlagValue>,
    context: Record<string, unknown> = { targetingKey: 'user-1', plan: 'pro' }
) => {
    hooks.forEach(hook =>
        hook.after?.(hookContext(context), details, undefined as never)
    );
};

type FetchCall = { url: string; body: string };

const fetchCalls = (): FetchCall[] =>
    (globalThis.fetch as jest.Mock).mock.calls.map(([url, init]) => ({
        url,
        body: init.body
    }));

const sentEvents = (call: FetchCall): unknown[] =>
    call.body.split('\n').map(line => JSON.parse(line));

let appStateListeners: Array<(state: AppStateStatus) => void>;
const removeAppStateListener = jest.fn();

beforeEach(() => {
    jest.useFakeTimers();
    globalThis.fetch = jest.fn(() => Promise.resolve({} as Response));
    appStateListeners = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
        _type: string,
        listener: (state: AppStateStatus) => void
    ) => {
        appStateListeners.push(listener);
        return { remove: removeAppStateListener };
    }) as never);
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
});

describe('intake transport', () => {
    it.each([
        ['datadoghq.com', 'browser-intake-datadoghq.com'],
        ['us3.datadoghq.com', 'browser-intake-us3-datadoghq.com'],
        ['us5.datadoghq.com', 'browser-intake-us5-datadoghq.com'],
        ['ap1.datadoghq.com', 'browser-intake-ap1-datadoghq.com'],
        ['datadoghq.eu', 'browser-intake-datadoghq.eu'],
        ['ddog-gov.com', 'browser-intake-ddog-gov.com'],
        ['datad0g.com', 'browser-intake-datad0g.com']
    ])('builds the intake host for %s', (site, host) => {
        expect(buildIntakeHost(site)).toBe(host);
    });

    it('sends newline-delimited JSON with the client token in the query', () => {
        const batch = startIntakeBatch(
            {
                clientToken: 'token',
                site: 'datadoghq.eu',
                flagEvaluationTrackingInterval: 10000
            },
            'exposures'
        );
        batch.add({ a: 1 });
        batch.add({ b: 2 });
        batch.flush();

        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
        expect(url).toMatch(
            /^https:\/\/browser-intake-datadoghq\.eu\/api\/v2\/exposures\?ddsource=react-native&dd-api-key=token&dd-evp-origin-version=\d+\.\d+\.\d+[^&]*&dd-evp-origin=react-native&dd-request-id=[0-9a-f-]{36}$/
        );
        expect(init).toEqual({
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: '{"a":1}\n{"b":2}'
        });
    });

    it('forwards through a proxy with ddforward', () => {
        const batch = startIntakeBatch(
            {
                clientToken: 'token',
                site: 'datadoghq.com',
                proxy: 'https://proxy.example.com/intake',
                flagEvaluationTrackingInterval: 10000
            },
            'flagevaluation'
        );
        batch.add({ a: 1 });
        batch.flush();

        const { url } = fetchCalls()[0];
        expect(url).toMatch(
            /^https:\/\/proxy\.example\.com\/intake\?ddforward=%2Fapi%2Fv2%2Fflagevaluation%3Fddsource%3Dreact-native%26dd-api-key%3Dtoken/
        );
    });

    it('sends when the batch is full, the timeout expires, or the app leaves the foreground', () => {
        const batch = startIntakeBatch(
            {
                clientToken: 'token',
                site: 'datadoghq.com',
                flagEvaluationTrackingInterval: 10000
            },
            'exposures',
            { flushTimeoutMs: 1000, maxEvents: 2 }
        );

        batch.add({ n: 1 });
        batch.add({ n: 2 });
        expect(fetchCalls()).toHaveLength(1);

        batch.add({ n: 3 });
        jest.advanceTimersByTime(1000);
        expect(fetchCalls()).toHaveLength(2);

        batch.add({ n: 4 });
        appStateListeners.forEach(listener => listener('active'));
        expect(fetchCalls()).toHaveLength(2);
        appStateListeners.forEach(listener => listener('background'));
        expect(fetchCalls()).toHaveLength(3);
        expect(fetchCalls().map(sentEvents)).toEqual([
            [{ n: 1 }, { n: 2 }],
            [{ n: 3 }],
            [{ n: 4 }]
        ]);
    });

    it('sends before the batch exceeds the byte limit and drops oversized events', () => {
        const batch = startIntakeBatch(
            {
                clientToken: 'token',
                site: 'datadoghq.com',
                flagEvaluationTrackingInterval: 10000
            },
            'exposures',
            { batchBytesLimit: 30, messageBytesLimit: 25 }
        );

        // Each {"s":"…"} message is 8 bytes plus the value.
        batch.add({ s: 'aaaa' }); // 12 bytes
        batch.add({ s: 'bbbb' }); // 12 + 1 + 12 = 25 bytes
        expect(fetchCalls()).toHaveLength(0);

        batch.add({ s: 'cccc' }); // 25 + 12 >= 30, so send first
        expect(fetchCalls()).toHaveLength(1);

        batch.add({ s: 'x'.repeat(18) }); // 26 bytes, dropped
        batch.add({ s: 'dddddddddddddddd' }); // 12 + 24 >= 30, so send first
        batch.add({ s: 'e'.repeat(10) }); // 24 + 18 >= 30, so send first
        batch.flush();

        expect(fetchCalls().map(sentEvents)).toEqual([
            [{ s: 'aaaa' }, { s: 'bbbb' }],
            [{ s: 'cccc' }],
            [{ s: 'dddddddddddddddd' }],
            [{ s: 'e'.repeat(10) }]
        ]);
    });

    it('applies the byte limits at exactly the limit, leaving out the separator before adding', () => {
        const batch = startIntakeBatch(
            {
                clientToken: 'token',
                site: 'datadoghq.com',
                flagEvaluationTrackingInterval: 10000
            },
            'exposures',
            { batchBytesLimit: 24, messageBytesLimit: 13 }
        );

        batch.add({ s: 'x'.repeat(5) }); // 13 bytes, dropped
        batch.add({ s: 'aaaa' }); // 12 bytes
        batch.add({ s: 'bbbb' }); // 12 + 12 >= 24, so send first
        batch.flush();

        expect(fetchCalls().map(sentEvents)).toEqual([
            [{ s: 'aaaa' }],
            [{ s: 'bbbb' }]
        ]);
    });

    it('sends as soon as the batch reaches the byte limit', () => {
        const batch = startIntakeBatch(
            {
                clientToken: 'token',
                site: 'datadoghq.com',
                flagEvaluationTrackingInterval: 10000
            },
            'exposures',
            { batchBytesLimit: 12 }
        );

        batch.add({ s: 'aaaa' }); // 12 bytes
        expect(fetchCalls()).toHaveLength(1);
    });

    it.each([
        ['ascii', 'abc', 3],
        ['two-byte', 'é', 2],
        ['three-byte', '€', 3],
        ['surrogate pair', '😀', 4],
        ['lone surrogate', '\ud800', 3]
    ])('counts UTF-8 bytes for %s characters', (_name, value, bytes) => {
        expect(computeBytesCount(value)).toBe(bytes);
    });

    it('sends pending events and removes its AppState listener on stop', () => {
        const batch = startIntakeBatch(
            {
                clientToken: 'token',
                site: 'datadoghq.com',
                flagEvaluationTrackingInterval: 10000
            },
            'exposures'
        );
        batch.add({ n: 1 });
        batch.stop();

        expect(fetchCalls()).toHaveLength(1);
        expect(removeAppStateListener).toHaveBeenCalledTimes(1);
    });

    it('drops events when the request fails', async () => {
        globalThis.fetch = jest.fn(() => Promise.reject(new Error('offline')));
        const batch = startIntakeBatch(
            {
                clientToken: 'token',
                site: 'datadoghq.com',
                flagEvaluationTrackingInterval: 10000
            },
            'exposures'
        );
        batch.add({ n: 1 });
        expect(() => batch.flush()).not.toThrow();
        await Promise.resolve();
    });

    it('does not throw when fetch throws synchronously', () => {
        globalThis.fetch = jest.fn(() => {
            throw new Error('no fetch');
        });
        const batch = startIntakeBatch(
            {
                clientToken: 'token',
                site: 'datadoghq.com',
                flagEvaluationTrackingInterval: 10000
            },
            'exposures'
        );
        batch.add({ n: 1 });
        expect(() => batch.flush()).not.toThrow();
    });
});

describe('createDatadogExposureLoggingHook', () => {
    it('does not track until initialized', () => {
        const tracking = createDatadogExposureLoggingHook(options);
        runAfter(tracking.hooks, loggedDetails());
        jest.runOnlyPendingTimers();

        expect(globalThis.fetch).not.toHaveBeenCalled();
        expect(AppState.addEventListener).not.toHaveBeenCalled();
    });

    it('sends a logged exposure with service, RUM application, and timestamp', async () => {
        jest.setSystemTime(1_700_000_000_000);
        const tracking = createDatadogExposureLoggingHook(options);
        await tracking.initialize();

        runAfter(
            tracking.hooks,
            loggedDetails({
                flagMetadata: {
                    allocationKey: 'allocation',
                    doLog: true,
                    __dd_split_serial_id: 7
                }
            })
        );
        await tracking.shutdown();

        const calls = fetchCalls();
        expect(calls).toHaveLength(1);
        expect(calls[0].url).toContain(
            'https://browser-intake-datadoghq.com/api/v2/exposures?'
        );
        expect(sentEvents(calls[0])).toEqual([
            {
                allocation: { key: 'allocation' },
                flag: { key: 'flag' },
                variant: { key: 'on' },
                serial_id: 7,
                subject: { id: 'user-1', attributes: { plan: 'pro' } },
                service: 'shop',
                rum: { application: { id: 'app-id' } },
                timestamp: 1_700_000_000_000
            }
        ]);
    });

    it('does not send unlogged evaluations or results without a variant', async () => {
        const tracking = createDatadogExposureLoggingHook(options);
        await tracking.initialize();

        runAfter(
            tracking.hooks,
            loggedDetails({
                flagMetadata: { allocationKey: 'allocation', doLog: false }
            })
        );
        runAfter(tracking.hooks, loggedDetails({ variant: undefined }));
        await tracking.shutdown();

        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('deduplicates exposures per subject, flag, and assignment', async () => {
        const tracking = createDatadogExposureLoggingHook(options);
        await tracking.initialize();

        runAfter(tracking.hooks, loggedDetails());
        runAfter(tracking.hooks, loggedDetails());
        runAfter(tracking.hooks, loggedDetails(), { targetingKey: 'user-2' });
        runAfter(tracking.hooks, loggedDetails({ variant: 'off' }));
        await tracking.shutdown();

        expect(fetchCalls().flatMap(sentEvents)).toMatchObject([
            { subject: { id: 'user-1' }, variant: { key: 'on' } },
            { subject: { id: 'user-2' }, variant: { key: 'on' } },
            { subject: { id: 'user-1' }, variant: { key: 'off' } }
        ]);
    });

    it('sends the exposure again for a new core configuration', async () => {
        const tracking = createDatadogExposureLoggingHook(options);
        await tracking.initialize();
        const withConfigurationId = (id: string) =>
            loggedDetails({
                flagMetadata: {
                    allocationKey: 'allocation',
                    doLog: true,
                    __dd_core_configuration_id: id
                }
            });

        runAfter(tracking.hooks, withConfigurationId('first'));
        runAfter(tracking.hooks, withConfigurationId('first'));
        runAfter(tracking.hooks, withConfigurationId('second'));
        await tracking.shutdown();

        const events = fetchCalls().flatMap(sentEvents);
        expect(events).toHaveLength(2);
        // The configuration ID only scopes deduplication; it is not sent.
        expect(events[0]).not.toHaveProperty('__dd_core_configuration_id');
    });

    it('keeps deduplication across shutdown and initialize', async () => {
        const tracking = createDatadogExposureLoggingHook(options);
        await tracking.initialize();
        runAfter(tracking.hooks, loggedDetails());
        await tracking.shutdown();
        await tracking.initialize();
        runAfter(tracking.hooks, loggedDetails());
        await tracking.shutdown();

        expect(fetchCalls().flatMap(sentEvents)).toHaveLength(1);
    });

    it('stops tracking after shutdown', async () => {
        const tracking = createDatadogExposureLoggingHook(options);
        await tracking.initialize();
        await tracking.shutdown();
        runAfter(tracking.hooks, loggedDetails());
        jest.runOnlyPendingTimers();

        expect(globalThis.fetch).not.toHaveBeenCalled();
        expect(removeAppStateListener).toHaveBeenCalledTimes(1);
    });

    it('returns no hooks without a client token', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const tracking = createDatadogExposureLoggingHook(
            ({} as unknown) as DatadogTrackingHooksOptions
        );

        expect(tracking.hooks).toEqual([]);
        await expect(tracking.initialize()).resolves.toBeUndefined();
        await expect(tracking.shutdown()).resolves.toBeUndefined();
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('`clientToken`')
        );
    });
});

describe('createDatadogEvaluationLoggingHook', () => {
    it('aggregates evaluations and sends them after the tracking interval', async () => {
        jest.setSystemTime(1_700_000_000_000);
        const tracking = createDatadogEvaluationLoggingHook({
            ...options,
            flagEvaluationTrackingInterval: 5000
        });
        await tracking.initialize();

        runAfter(tracking.hooks, loggedDetails());
        jest.advanceTimersByTime(1000);
        runAfter(tracking.hooks, loggedDetails());
        expect(globalThis.fetch).not.toHaveBeenCalled();

        jest.advanceTimersByTime(4000);
        const calls = fetchCalls();
        expect(calls).toHaveLength(1);
        expect(calls[0].url).toContain(
            'https://browser-intake-datadoghq.com/api/v2/flagevaluation?'
        );
        expect(sentEvents(calls[0])).toEqual([
            expect.objectContaining({
                flag: { key: 'flag' },
                variant: { key: 'on' },
                allocation: { key: 'allocation' },
                evaluation_count: 2,
                first_evaluation: 1_700_000_000_000,
                last_evaluation: 1_700_000_001_000,
                runtime_default_used: false,
                targeting_key: 'user-1',
                context: {
                    evaluation: { plan: 'pro' },
                    dd: {
                        service: 'shop',
                        rum: { application: { id: 'app-id' } }
                    }
                }
            })
        ]);
        await tracking.shutdown();
    });

    it('sends aggregated evaluations when the app leaves the foreground', async () => {
        const tracking = createDatadogEvaluationLoggingHook(options);
        await tracking.initialize();
        runAfter(tracking.hooks, loggedDetails());

        appStateListeners.forEach(listener => listener('background'));

        expect(fetchCalls()).toHaveLength(1);
        await tracking.shutdown();
    });

    it('sends pending evaluations on shutdown and stops the interval', async () => {
        const tracking = createDatadogEvaluationLoggingHook(options);
        await tracking.initialize();
        runAfter(tracking.hooks, loggedDetails());
        await tracking.shutdown();
        expect(fetchCalls()).toHaveLength(1);

        runAfter(tracking.hooks, loggedDetails());
        jest.advanceTimersByTime(60000);
        expect(fetchCalls()).toHaveLength(1);
    });

    it('clamps the tracking interval', async () => {
        const tracking = createDatadogEvaluationLoggingHook({
            ...options,
            flagEvaluationTrackingInterval: 10
        });
        await tracking.initialize();
        runAfter(tracking.hooks, loggedDetails());

        jest.advanceTimersByTime(999);
        expect(globalThis.fetch).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1);
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        await tracking.shutdown();
    });

    it.each([NaN, Infinity])(
        'uses the default tracking interval for %s',
        async flagEvaluationTrackingInterval => {
            const tracking = createDatadogEvaluationLoggingHook({
                ...options,
                flagEvaluationTrackingInterval
            });
            await tracking.initialize();
            runAfter(tracking.hooks, loggedDetails());

            jest.advanceTimersByTime(9999);
            expect(globalThis.fetch).not.toHaveBeenCalled();
            jest.advanceTimersByTime(1);
            expect(globalThis.fetch).toHaveBeenCalledTimes(1);
            await tracking.shutdown();
        }
    );
});

describe('createDatadogRumTrackingHook', () => {
    it('adds the evaluated variant to RUM', () => {
        const tracking = createDatadogRumTrackingHook();
        runAfter(tracking.hooks, loggedDetails());

        expect(mockAddFeatureFlagEvaluation).toHaveBeenCalledWith('flag', 'on');
    });

    it('skips results without a variant', () => {
        const tracking = createDatadogRumTrackingHook();
        runAfter(tracking.hooks, loggedDetails({ variant: undefined }));

        expect(mockAddFeatureFlagEvaluation).not.toHaveBeenCalled();
    });

    it('does not interrupt evaluation when RUM fails', async () => {
        mockAddFeatureFlagEvaluation.mockImplementationOnce(() => {
            throw new Error('sync');
        });
        mockAddFeatureFlagEvaluation.mockImplementationOnce(() =>
            Promise.reject(new Error('async'))
        );
        const tracking = createDatadogRumTrackingHook();

        expect(() => runAfter(tracking.hooks, loggedDetails())).not.toThrow();
        expect(() => runAfter(tracking.hooks, loggedDetails())).not.toThrow();
        await Promise.resolve();
    });
});

describe('composeDatadogTrackingHooks', () => {
    it('combines hooks and lifecycle methods', async () => {
        const first = {
            hooks: [{ after: jest.fn() }],
            initialize: jest.fn(),
            shutdown: jest.fn()
        };
        const second = { hooks: [{ after: jest.fn() }] };
        const tracking = composeDatadogTrackingHooks(first, second);

        expect(tracking.hooks).toEqual([...first.hooks, ...second.hooks]);
        await tracking.initialize();
        await tracking.shutdown();
        expect(first.initialize).toHaveBeenCalledTimes(1);
        expect(first.shutdown).toHaveBeenCalledTimes(1);
    });

    it('does not reject when a lifecycle method fails', async () => {
        const tracking = composeDatadogTrackingHooks(
            {
                hooks: [],
                initialize: () => {
                    throw new Error('sync');
                }
            },
            { hooks: [], initialize: () => Promise.reject(new Error('async')) }
        );

        await expect(tracking.initialize()).resolves.toBeUndefined();
    });
});
