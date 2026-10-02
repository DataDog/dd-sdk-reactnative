/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { configurationToString } from '@datadog/flagging-core/rules-based';
import { getMD5Hash } from '@datadog/flagging-core';
import type { FlagsConfiguration } from '@datadog/flagging-core';

import { DatadogCoreEvaluationProvider } from './datadogCoreProvider';

// Rules parsing loads Protobuf-ES. Keep it behind this entry, as the browser SDK does.
export { configurationFromString as coreConfigurationFromString } from '@datadog/flagging-core/rules-based';
export type { FlagsConfiguration } from '@datadog/flagging-core';

/**
 * Evaluates manually supplied precomputed or rules-based configurations in JavaScript using
 * @datadog/flagging-core. Ported from openfeature-js-client's browser DatadogCoreProvider.
 *
 * Unlike the native-backed providers, this provider does not use DdFlags, fetch configuration,
 * or send exposure/RUM events. Load a configuration before registering it with OpenFeature.
 * Precomputed configurations require a matching OpenFeature context, including when it is empty.
 */
export class DatadogCoreProvider extends DatadogCoreEvaluationProvider {
    private fallbackConfigurationSequence = 0;

    protected computeConfigurationId(
        configuration: FlagsConfiguration
    ): string {
        try {
            // Retrieval metadata and the UFC build timestamp can change without changing rules.
            // The backend's semantic Fingerprint() also excludes the rules' CreatedAt.
            return getMD5Hash(
                configurationToString({
                    ...configuration,
                    precomputed: configuration.precomputed && {
                        ...configuration.precomputed,
                        fetchedAt: undefined,
                        etag: undefined
                    },
                    rules: configuration.rules && {
                        ...configuration.rules,
                        response: {
                            ...configuration.rules.response,
                            createdAt: undefined
                        },
                        fetchedAt: undefined,
                        etag: undefined
                    }
                })
            );
        } catch {
            this.fallbackConfigurationSequence += 1;
            return `core-configuration-${this.fallbackConfigurationSequence}`;
        }
    }
}
