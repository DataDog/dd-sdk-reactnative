/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    DdNativeLogsType,
    DdNativeRumType,
    DdNativeSdkType
} from '../nativeModulesTypes';
import { getGlobalInstance } from '../utils/singletonUtils';

type NativeModuleOverrides = {
    sdk?: DdNativeSdkType;
    rum?: DdNativeRumType;
    logs?: DdNativeLogsType;
};
const state = getGlobalInstance<{ modules: NativeModuleOverrides }>(
    'com.datadog.reactnative.platform_native_modules',
    () => ({ modules: {} })
);

/** Registers platform adapters without resolving any native module on import. */
export const registerNativeModuleOverrides = (
    modules: NativeModuleOverrides
): void => {
    state.modules = modules;
};
export const getNativeModuleOverrides = (): NativeModuleOverrides =>
    state.modules;
