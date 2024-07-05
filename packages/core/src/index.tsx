/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
/* eslint-disable arca/import-ordering */

import './polyfills';
import {
    DatadogProviderConfiguration,
    DdSdkReactNativeConfiguration,
    InitializationMode,
    VitalsUpdateFrequency,
    UploadFrequency,
    BatchSize
} from './DdSdkReactNativeConfiguration';
import { DdSdkReactNative } from './DdSdkReactNative';
import { InternalLog } from './InternalLog';
import { ProxyConfiguration, ProxyType } from './ProxyConfiguration';
import { SdkVerbosity } from './SdkVerbosity';
import { TrackingConsent } from './TrackingConsent';
import { DdLogs } from './logs/DdLogs';
import { DdRum } from './rum/DdRum';
import {
    DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER,
    DATADOG_GRAPH_QL_OPERATION_NAME_HEADER,
    DATADOG_GRAPH_QL_VARIABLES_HEADER
} from './rum/instrumentation/resourceTracking/graphql/graphqlHeaders';
import { RumActionType, ErrorSource, PropagatorType } from './rum/types';
import { DatadogProvider } from './sdk/DatadogProvider/DatadogProvider';
import { FileBasedConfiguration } from './sdk/FileBasedConfiguration/FileBasedConfiguration';
import { DdTrace } from './trace/DdTrace';
import { DefaultTimeProvider } from './utils/time-provider/DefaultTimeProvider';
import { TimeProvider } from './utils/time-provider/TimeProvider';
import type { Timestamp } from './utils/time-provider/TimeProvider';

/* eslint-enable arca/import-ordering */

export {
    DatadogProvider,
    DatadogProviderConfiguration,
    FileBasedConfiguration,
    InitializationMode,
    DdLogs,
    DdTrace,
    DdRum,
    RumActionType,
    ErrorSource,
    DdSdkReactNativeConfiguration,
    DdSdkReactNative,
    InternalLog,
    ProxyConfiguration,
    ProxyType,
    TrackingConsent,
    SdkVerbosity,
    VitalsUpdateFrequency,
    PropagatorType,
    UploadFrequency,
    BatchSize,
    TimeProvider,
    DefaultTimeProvider,
    DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER,
    DATADOG_GRAPH_QL_OPERATION_NAME_HEADER,
    DATADOG_GRAPH_QL_VARIABLES_HEADER
};

export type { Timestamp };
