/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../config/types/SdkVerbosity';
import type { DdNativeFlagsType } from '../nativeModulesTypes';
import { getGlobalInstance } from '../utils/singletonUtils';

import { FlagsClient } from './FlagsClient';
import type { DdFlagsType, FlagsConfiguration } from './types';

const FLAGS_MODULE = 'com.datadog.reactnative.flags';
const MAX_ASSIGNMENT_REQUEST_RETRY_COUNT = 10;

const validateAssignmentRequestConfiguration = (
    configuration: FlagsConfiguration
): void => {
    const {
        assignmentRequestTimeoutMs,
        assignmentRequestRetryCount
    } = configuration;

    if (
        assignmentRequestTimeoutMs !== undefined &&
        (!Number.isSafeInteger(assignmentRequestTimeoutMs) ||
            assignmentRequestTimeoutMs < 0)
    ) {
        throw new Error(
            '`assignmentRequestTimeoutMs` must be a non-negative integer.'
        );
    }

    if (
        assignmentRequestRetryCount !== undefined &&
        (!Number.isInteger(assignmentRequestRetryCount) ||
            assignmentRequestRetryCount < 0 ||
            assignmentRequestRetryCount > MAX_ASSIGNMENT_REQUEST_RETRY_COUNT)
    ) {
        throw new Error(
            '`assignmentRequestRetryCount` must be an integer between 0 and 10.'
        );
    }
};

/**
 * Implementation class for {@link DdFlagsType}. Please see the interface for documentation.
 */
class DdFlagsWrapper implements DdFlagsType {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeFlags: DdNativeFlagsType = require('../specs/NativeDdFlags')
        .default;

    private isFeatureEnabled = false;

    /**
     * A map of client names to their corresponding {@link FlagsClient} instances.
     *
     * Each of these clients hold their own context and flags state.
     */
    private clients: Record<string, FlagsClient> = {};

    enable = async (configuration: FlagsConfiguration = {}): Promise<void> => {
        validateAssignmentRequestConfiguration(configuration);

        await this.nativeFlags.enable({ enabled: true, ...configuration });

        this.isFeatureEnabled = true;
    };

    getClient = (clientName: string = 'default'): FlagsClient => {
        if (!this.isFeatureEnabled) {
            InternalLog.log(
                '`DdFlags.getClient()` called before Datadog Flags feature have been enabled. Client will fall back to serving default flag values.',
                SdkVerbosity.ERROR
            );
        }

        if (!this.clients[clientName]) {
            this.clients[clientName] = new FlagsClient(clientName);
        }

        return this.clients[clientName];
    };
}

export const DdFlags: DdFlagsType = getGlobalInstance(
    FLAGS_MODULE,
    () => new DdFlagsWrapper()
);
