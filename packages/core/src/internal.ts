/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Sanctioned entry point for cross-package internals consumed by platform
 * packages (e.g. @datadog/mobile-react-native-vega). NOT part of the public API
 * and may change between minor versions. Everything re-exported here must be
 * native-free at import (must not call TurboModuleRegistry / NativeModules at
 * module load).
 */
export { addDefaultValuesToAutoInstrumentationConfiguration } from './config/async/AutoInstrumentationConfiguration';
export { buildConfigurationFromPartialConfiguration } from './config/async/asyncInitializationHelper';
export { DdSdkNativeConfiguration } from './config/features/CoreConfigurationNative';
export { RUM_DEFAULTS } from './config/features/RumConfiguration';
export { adaptLongTaskThreshold } from './utils/longTasksUtils';
export { version } from './version';
export { AccountInfoSingleton } from './sdk/AccountInfoSingleton/AccountInfoSingleton';
export { AttributesSingleton } from './sdk/AttributesSingleton/AttributesSingleton';
export { UserInfoSingleton } from './sdk/UserInfoSingleton/UserInfoSingleton';
export { GlobalState } from './sdk/GlobalState/GlobalState';
export { BufferSingleton } from './sdk/DatadogProvider/Buffer/BufferSingleton';
export { DatadogProviderState } from './sdk/DatadogProvider/DatadogProviderState';
export { DdRumResourceTracking } from './rum/instrumentation/resourceTracking/DdRumResourceTracking';
export { DdRumErrorTracking } from './rum/instrumentation/DdRumErrorTracking';
export { DdAttributes } from './DdAttributes';
export { debugId } from './metro/debugIdResolver';

export type { Attributes } from './sdk/AttributesSingleton/types';
export type { LogsNativeConfiguration } from './config/features/LogsConfigurationNative';
export type { RumNativeConfiguration } from './config/features/RumConfigurationNative';
export type { TraceNativeConfiguration } from './config/features/TraceConfigurationNative';
export type { InitializationModeForTelemetry } from './config/types/InitializationModeForTelemetry';
