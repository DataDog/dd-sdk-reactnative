/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { DdSdkReactNative } from './DdSdkReactNative';
import { InternalLog } from './InternalLog';
import { DatadogProviderConfiguration } from './config/DatadogProviderConfiguration';
import { FileBasedConfiguration } from './config/FileBasedConfiguration';
import type { AutoInstrumentationConfiguration } from './config/async/AutoInstrumentationConfiguration';
import type { PartialInitializationConfiguration } from './config/async/PartialInitializationConfiguration';
import type { CoreConfigurationOptions } from './config/features/CoreConfiguration.type';
import { CoreConfiguration } from './config/features/CoreConfiguration';
import type { LogsConfigurationOptions } from './config/features/LogsConfiguration.type';
import { LogsConfiguration } from './config/features/LogsConfiguration';
import type { RumConfigurationOptions } from './config/features/RumConfiguration.type';
import { RumConfiguration } from './config/features/RumConfiguration';
import type { TraceConfigurationOptions } from './config/features/TraceConfiguration.type';
import { TraceConfiguration } from './config/features/TraceConfiguration';
import {
    ProxyConfiguration,
    ProxyType
} from './config/types/ProxyConfiguration';
import { SdkVerbosity } from './config/types/SdkVerbosity';
import { TrackingConsent } from './config/types/TrackingConsent';
import {
    BatchProcessingLevel,
    BatchSize,
    InitializationMode,
    UploadFrequency,
    VitalsUpdateFrequency
} from './config/types';
import { DdFlags } from './flags/DdFlags';
import type { FlagsClient } from './flags/FlagsClient';
import type {
    FlagsConfiguration,
    FlagDetails,
    EvaluationContext,
    PrimitiveValue
} from './flags/types';
import { DdLogs } from './logs/DdLogs';
import { DdRum } from './rum/DdRum';
import { DdBabelInteractionTracking } from './rum/instrumentation/interactionTracking/DdBabelInteractionTracking';
import { __ddExtractText } from './rum/instrumentation/interactionTracking/ddBabelUtils';
import { DatadogTracingContext } from './rum/instrumentation/resourceTracking/distributedTracing/DatadogTracingContext';
import { DatadogTracingIdentifier } from './rum/instrumentation/resourceTracking/distributedTracing/DatadogTracingIdentifier';
import {
    TracingIdFormat,
    TracingIdType
} from './rum/instrumentation/resourceTracking/distributedTracing/TracingIdentifier';
import {
    DATADOG_GRAPH_QL_OPERATION_NAME_HEADER,
    DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER,
    DATADOG_GRAPH_QL_VARIABLES_HEADER
} from './rum/instrumentation/resourceTracking/graphql/graphqlHeaders';
import type { FirstPartyHost } from './rum/types';
import { PropagatorType, RumActionType } from './rum/types';
import { DatadogProvider } from './sdk/DatadogProvider/DatadogProvider';
import { DdSdk } from './sdk/DdSdk';
import { DdTrace } from './trace/DdTrace';
import { ErrorSource, FeatureOperationFailure } from './types';
import { DefaultTimeProvider } from './utils/time-provider/DefaultTimeProvider';
import type { Timestamp } from './utils/time-provider/TimeProvider';
import { TimeProvider } from './utils/time-provider/TimeProvider';

export {
    DatadogProvider,
    DatadogProviderConfiguration,
    FileBasedConfiguration,
    InitializationMode,
    DdLogs,
    DdFlags,
    DdTrace,
    DdRum,
    RumActionType,
    ErrorSource,
    FeatureOperationFailure,
    CoreConfiguration,
    RumConfiguration,
    LogsConfiguration,
    TraceConfiguration,
    DdSdkReactNative,
    DdSdk,
    InternalLog,
    ProxyConfiguration,
    ProxyType,
    TrackingConsent,
    SdkVerbosity,
    VitalsUpdateFrequency,
    PropagatorType,
    UploadFrequency,
    BatchSize,
    BatchProcessingLevel,
    TimeProvider,
    DefaultTimeProvider,
    DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER,
    DATADOG_GRAPH_QL_OPERATION_NAME_HEADER,
    DATADOG_GRAPH_QL_VARIABLES_HEADER,
    TracingIdType,
    TracingIdFormat,
    DatadogTracingIdentifier,
    DatadogTracingContext,
    DdBabelInteractionTracking,
    __ddExtractText
};
export type {
    Timestamp,
    FirstPartyHost,
    AutoInstrumentationConfiguration,
    PartialInitializationConfiguration,
    CoreConfigurationOptions,
    RumConfigurationOptions,
    LogsConfigurationOptions,
    TraceConfigurationOptions,
    FlagsConfiguration,
    FlagsClient,
    EvaluationContext,
    PrimitiveValue,
    FlagDetails
};
