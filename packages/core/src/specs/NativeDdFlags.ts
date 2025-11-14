/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

import type { FlagDetails } from '../flags/types';

/**
 * Do not import this Spec directly, use DdNativeFlagsType instead.
 */
export interface Spec extends TurboModule {
    // TODO: Flags and all other features are initialized globally for now. We want to change this in the future.
    // readonly enable: (
    //     configuration: DatadogFlagsConfiguration
    // ) => Promise<void>;

    readonly setEvaluationContext: (
        clientName: string,
        targetingKey: string,
        attributes: { [key: string]: unknown }
    ) => Promise<void>;

    readonly getBooleanValue: (
        clientName: string,
        key: string,
        defaultValue: boolean
    ) => Promise<boolean>;

    readonly getStringValue: (
        clientName: string,
        key: string,
        defaultValue: string
    ) => Promise<string>;

    readonly getNumberValue: (
        clientName: string,
        key: string,
        defaultValue: number
    ) => Promise<number>;

    readonly getObjectValue: (
        clientName: string,
        key: string,
        defaultValue: { [key: string]: unknown }
    ) => Promise<{ [key: string]: unknown }>;

    readonly getBooleanDetails: (
        clientName: string,
        key: string,
        defaultValue: boolean
    ) => Promise<FlagDetails<boolean>>;
}

// eslint-disable-next-line import/no-default-export
export default TurboModuleRegistry.get<Spec>('DdFlags');
