/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { NativeModules } from 'react-native';
import { DdSdkConfiguration } from './types';
import RumReactNavigationTracking from './rum/instrumentation/RumReactNavigationTracking';
const DdSdk = NativeModules.DdSdk;
const DdLogs = NativeModules.DdLogs;
const DdTrace = NativeModules.DdTrace;
const DdRum = NativeModules.DdRum;
export { DdSdkConfiguration, DdSdk, DdLogs, DdTrace, DdRum, RumReactNavigationTracking as ReactNavigationTrackingStrategy };
//# sourceMappingURL=index.js.map