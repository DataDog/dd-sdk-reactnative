/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export { DdSdkReactNative } from './DdSdkReactNativeVega';
export { DdRum } from './DdRumVega';
export { DatadogProvider } from './DatadogProvider';

export {
    DatadogProviderConfiguration,
    FileBasedConfiguration,
    InitializationMode,
    BatchProcessingLevel,
    BatchSize,
    UploadFrequency,
    VitalsUpdateFrequency,
    RumActionType,
    PropagatorType,
    ErrorSource,
    FeatureOperationFailure,
    CoreConfiguration,
    RumConfiguration,
    TrackingConsent,
    SdkVerbosity,
    TimeProvider,
    DefaultTimeProvider,
    InternalLog,
    ProxyConfiguration,
    ProxyType,
    DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER,
    DATADOG_GRAPH_QL_OPERATION_NAME_HEADER,
    DATADOG_GRAPH_QL_VARIABLES_HEADER,
    DATADOG_GRAPH_QL_PAYLOAD_HEADER,
    DATADOG_GRAPH_QL_ERROR_HEADER,
    TracingIdType,
    TracingIdFormat,
    DatadogTracingIdentifier,
    DatadogTracingContext,
    DdBabelInteractionTracking,
    __ddExtractText
} from '@datadog/mobile-react-native';

export type {
    Timestamp,
    FirstPartyHost,
    AutoInstrumentationConfiguration,
    PartialInitializationConfiguration,
    CoreConfigurationOptions,
    RumConfigurationOptions,
    FlagsConfiguration,
    FlagDetails,
    EvaluationContext,
    PrimitiveValue,
    FlagsClient
} from '@datadog/mobile-react-native';
