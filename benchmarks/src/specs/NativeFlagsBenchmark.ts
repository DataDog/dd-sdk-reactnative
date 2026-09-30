/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

// Benchmark app only. Objects intentionally exercise normal RN argument/result conversion.
export interface Spec extends TurboModule {
  runSync(request: Object): Object;
  runAsync(request: Object): Promise<Object>;
  trackBatch(records: Array<Object>): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('FlagsBenchmark');
