/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

import type { FlagCacheEntry } from '../flags/internal';

/**
 * Do not import this Spec directly, use DdNativeFlagsType instead.
 */
export interface Spec extends TurboModule {
    readonly enable: (configuration: Object) => Promise<void>;

    readonly setEvaluationContext: (
        clientName: string,
        targetingKey: string,
        attributes: Object
    ) => Promise<{ [key: string]: FlagCacheEntry }>;

    readonly trackEvaluation: (
        clientName: string,
        key: string,
        rawFlag: Object,
        targetingKey: string,
        attributes: Object
    ) => Promise<void>;
}

// eslint-disable-next-line import/no-default-export
export default TurboModuleRegistry.get<Spec>('DdFlags');
