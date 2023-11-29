/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Do not import this Spec directly, use DdNativeCoreTestsType instead.
 */
export interface Spec extends TurboModule {
    readonly getConstants: () => {};

    clearData(): Promise<void>;
    getAllEvents(feature: string): Promise<any>;
    getAllEventsData(feature: string): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('DdCoreTests');
