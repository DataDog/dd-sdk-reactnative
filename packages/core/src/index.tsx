/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import {
    DatadogProviderConfiguration,
    DdSdkReactNativeConfiguration,
    InitializationMode,
    VitalsUpdateFrequency,
    UploadFrequency,
    BatchSize,
    BatchProcessingLevel
} from './DdSdkReactNativeConfiguration';
import type {
    AutoInstrumentationConfiguration,
    PartialInitializationConfiguration
} from './DdSdkReactNativeConfiguration';
import { DdSdkReactNative } from './DdSdkReactNative';
import { InternalLog, DATADOG_MESSAGE_PREFIX } from './InternalLog';
import { ProxyConfiguration, ProxyType } from './ProxyConfiguration';
import { SdkVerbosity } from './SdkVerbosity';
import { TrackingConsent } from './TrackingConsent';
import { DdAttributes } from './rum/DdAttributes';
// import { DdLogs } from './logs/DdLogs';
import { DdRum } from './rum/DdRum';
import { DatadogTracingContext } from './rum/instrumentation/resourceTracking/distributedTracing/DatadogTracingContext';
import { DatadogTracingIdentifier } from './rum/instrumentation/resourceTracking/distributedTracing/DatadogTracingIdentifier';
import {
    TracingIdType,
    TracingIdFormat
} from './rum/instrumentation/resourceTracking/distributedTracing/TracingIdentifier';
import {
    DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER,
    DATADOG_GRAPH_QL_OPERATION_NAME_HEADER,
    DATADOG_GRAPH_QL_VARIABLES_HEADER
} from './rum/instrumentation/resourceTracking/graphql/graphqlHeaders';
import { RumActionType, ErrorSource, PropagatorType } from './rum/types';
import type { FirstPartyHost } from './rum/types';
import type { Attributes } from './sdk/AttributesSingleton/types';
import { DatadogProvider } from './sdk/DatadogProvider/DatadogProvider';
import { DdSdk } from './sdk/DdSdk';
import { EventMapper } from './sdk/EventMappers/EventMapper';
import type { AdditionalEventDataForMapper } from './sdk/EventMappers/EventMapper';
import { FileBasedConfiguration } from './sdk/FileBasedConfiguration/FileBasedConfiguration';
import { DdTrace } from './trace/DdTrace';
import type { UserInfo } from './types';
import { validateContext } from './utils/argsUtils';
import { DefaultTimeProvider } from './utils/time-provider/DefaultTimeProvider';
import { TimeProvider } from './utils/time-provider/TimeProvider';
import type { Timestamp } from './utils/time-provider/TimeProvider';

export {
    EventMapper,
    DatadogProvider,
    DatadogProviderConfiguration,
    FileBasedConfiguration,
    InitializationMode,
    // DdLogs,
    DdTrace,
    DdRum,
    RumActionType,
    ErrorSource,
    DdSdkReactNativeConfiguration,
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
    DdAttributes,
    validateContext,
    DATADOG_MESSAGE_PREFIX
};

export type {
    AdditionalEventDataForMapper,
    Attributes,
    UserInfo,
    Timestamp,
    FirstPartyHost,
    AutoInstrumentationConfiguration,
    PartialInitializationConfiguration
};
