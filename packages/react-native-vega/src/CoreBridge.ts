/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { KeplerTurboModule } from '@amazon-devices/keplerscript-turbomodule-api';
import { TurboModuleRegistry } from '@amazon-devices/keplerscript-turbomodule-api';
import {
    getGlobalInstance,
    registerNativeModuleOverrides
} from '@datadog/mobile-react-native/internal';
import type {
    DdNativeLogsType,
    DdNativeRumType,
    DdNativeSdkType
} from '@datadog/mobile-react-native/internal';

import { isHttpProxyReady, startHttpProxy } from './HttpProxy';
import { getNativeDdSdk } from './turbo-modules/NativeDdSdk';

type NativeModule = KeplerTurboModule &
    Record<string, (...args: unknown[]) => Promise<unknown>>;
const lifecycle = getGlobalInstance<{ initialization?: Promise<void> }>(
    'com.datadog.reactnative.vega.initialization',
    () => ({})
);

const invoke = async (moduleName: string, method: string, args: unknown[]) => {
    try {
        const native = TurboModuleRegistry.get<NativeModule>(moduleName);
        return await native?.[method]?.(...args);
    } catch {
        return undefined;
    }
};
const methods = (moduleName: string, names: string[]) =>
    Object.fromEntries(
        names.map(name => [
            name,
            (...args: unknown[]) => invoke(moduleName, name, args)
        ])
    );

const initialize: DdNativeSdkType['initialize'] = async configuration => {
    if (!lifecycle.initialization) {
        lifecycle.initialization = (async () => {
            const native = getNativeDdSdk();
            if (!native) {
                throw Error('Vega native SDK is unavailable');
            }
            const cleanup = await startHttpProxy();
            try {
                if (!isHttpProxyReady()) {
                    throw Error('Vega HTTP transport did not start');
                }
                const serializable = {
                    ...configuration,
                    attributeEncoders: undefined
                };
                if (
                    (await native.initialize(
                        JSON.parse(JSON.stringify(serializable))
                    )) === false
                ) {
                    throw Error('Vega native SDK initialization failed');
                }
            } catch (error) {
                cleanup();
                throw error;
            }
        })();
    }
    try {
        await lifecycle.initialization;
    } catch (error) {
        lifecycle.initialization = undefined;
        throw error;
    }
};

const sdk = ({
    ...methods('DdSdk', [
        'addAttribute',
        'removeAttribute',
        'addAttributes',
        'removeAttributes',
        'setUserInfo',
        'clearUserInfo',
        'addUserExtraInfo',
        'setAccountInfo',
        'clearAccountInfo',
        'addAccountExtraInfo',
        'setTrackingConsent',
        'clearAllData',
        'sendTelemetryLog',
        'telemetryDebug',
        'telemetryError',
        'consumeWebviewEvent'
    ]),
    initialize,
    getConstants: () => ({}),
    addListener: () => undefined,
    removeListeners: () => undefined
} as unknown) as DdNativeSdkType;
const rum = {
    ...methods('DdRum', [
        'startView',
        'stopView',
        'startAction',
        'stopAction',
        'startResource',
        'stopResource',
        'addError',
        'addTiming',
        'addViewAttribute',
        'removeViewAttribute',
        'addViewAttributes',
        'removeViewAttributes',
        'addViewLoadingTime',
        'reportAppFullyDisplayed',
        'stopSession',
        'addFeatureFlagEvaluation',
        'getCurrentSessionId',
        'startFeatureOperation',
        'succeedFeatureOperation',
        'failFeatureOperation'
    ]),
    addAction: (...args: unknown[]) =>
        invoke(
            'DdRum',
            'addAction',
            args.filter((_, i) => i !== 2)
        ),
    getConstants: () => ({})
} as DdNativeRumType;
const logs: {
    -readonly [K in keyof DdNativeLogsType]?: DdNativeLogsType[K];
} = {
    getConstants: () => ({})
};
(['debug', 'info', 'warn', 'error'] as const).forEach(level => {
    logs[level] = (message, context) =>
        invoke('DdLogs', 'log', [level, message, '', '', '', context]).then(
            () => undefined
        );
    logs[`${level}WithError`] = (message, kind, error, stack, context) =>
        invoke('DdLogs', 'log', [
            level,
            message,
            kind,
            error,
            stack,
            context
        ]).then(() => undefined);
});

/** Keep core's configuration, buffering, mappers, and instrumentation on Vega's bridge. */
export const registerVegaBridge = (): void =>
    registerNativeModuleOverrides({ sdk, rum, logs: logs as DdNativeLogsType });
