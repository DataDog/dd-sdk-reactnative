/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';
import type { DdNativeFlagsType } from '../nativeModulesTypes';
import { getGlobalInstance } from '../utils/singletonUtils';

import { FlagsClient } from './FlagsClient';
import type { DatadogFlagsType, DatadogFlagsConfiguration } from './types';

const FLAGS_MODULE = 'com.datadog.reactnative.flags';

class DatadogFlagsWrapper implements DatadogFlagsType {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeFlags: DdNativeFlagsType = require('../specs/NativeDdFlags')
        .default;

    private isFeatureEnabled = false;

    /**
     * Enables the Datadog Flags feature in your application.
     *
     * Call this method after initializing the Datadog SDK to enable feature flag evaluation.
     * This method must be called before creating any `FlagsClient` instances via `DatadogFlags.getClient()`.
     *
     * @example
     * ```ts
     * import { DdSdkReactNativeConfiguration, DdSdkReactNative, DatadogFlags } from '@datadog/mobile-react-native';
     *
     * // Initialize the Datadog SDK.
     * await DdSdkReactNative.initialize(...);
     *
     * // Optinal flags configuration object.
     * const flagsConfig = {
     *     customFlagsEndpoint: 'https://flags.example.com'
     * };
     *
     * // Enable the feature.
     * await DatadogFlags.enable(flagsConfig);
     *
     * // Retrieve the client and access feature flags.
     * const flagsClient = DatadogFlags.getClient();
     * const flagValue = await flagsClient.getBooleanValue('new-feature', false);
     * ```
     *
     * @param configuration Configuration options for the Datadog Flags feature.
     */
    enable = async (
        configuration?: DatadogFlagsConfiguration
    ): Promise<void> => {
        if (configuration?.enabled === false) {
            return;
        }

        if (this.isFeatureEnabled) {
            InternalLog.log(
                'Datadog Flags feature has already been enabled. Skipping this `DatadogFlags.enable()` call.',
                SdkVerbosity.WARN
            );
        }

        // Default `enabled` to `true`.
        await this.nativeFlags.enable({ enabled: true, ...configuration });

        this.isFeatureEnabled = true;
    };

    /**
     * Returns a `FlagsClient` instance for further feature flag evaluation.
     *
     * For most applications, you would need only one client. If you need multiple clients,
     * you can retrieve a couple of clients with different names.
     *
     * @param clientName An optional name of the client to retrieve. Defaults to `'default'`.
     *
     * @example
     * ```ts
     * // Reminder: you need to initialize the SDK and enable the Flags feature before retrieving the client.
     * const flagsClient = DatadogFlags.getClient();
     * const flagValue = await flagsClient.getBooleanValue('new-feature', false);
     * ```
     */
    getClient = (clientName: string = 'default'): FlagsClient => {
        if (!this.isFeatureEnabled) {
            InternalLog.log(
                '`DatadogFlags.getClient()` called before Datadog Flags feature have been enabled. Client will fall back to serving default flag values.',
                SdkVerbosity.ERROR
            );
        }

        return new FlagsClient(clientName);
    };
}

export const DatadogFlags: DatadogFlagsType = getGlobalInstance(
    FLAGS_MODULE,
    () => new DatadogFlagsWrapper()
);
