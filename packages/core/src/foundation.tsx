/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';
import { DdSdkConfiguration, DdTraceType } from './types';
import {InternalLog} from "./InternalLog"
import {SdkVerbosity} from "./SdkVerbosity";
import {TimeProvider} from "./TimeProvider";
import type { DdNativeSdkType, DdNativeTraceType } from './nativeModulesTypes';
import { bufferNativeCallReturningId, bufferNativeCallWithId } from './sdk/DatadogProvider/Buffer/bufferNativeCall';

const timeProvider = new TimeProvider();

class DdTraceWrapper implements DdTraceType {

    private nativeTrace: DdNativeTraceType = NativeModules.DdTrace;

    startSpan(operation: string, context: object = {}, timestampMs: number = timeProvider.now()): Promise<string> {
        let spanId = bufferNativeCallReturningId(() =>this.nativeTrace.startSpan(operation, context, timestampMs));
        InternalLog.log("Starting span “" +  operation + "” #" + spanId, SdkVerbosity.DEBUG);
        return spanId
    }

    finishSpan(spanId: string, context: object = {}, timestampMs: number = timeProvider.now()): Promise<void> {
        InternalLog.log("Finishing span #" +  spanId, SdkVerbosity.DEBUG);
        return bufferNativeCallWithId((id) =>  this.nativeTrace.finishSpan(id, context, timestampMs), spanId);
    }
}

const DdSdk: DdNativeSdkType = NativeModules.DdSdk;
const DdTrace: DdTraceType = new DdTraceWrapper();

export { DdSdkConfiguration, DdSdk, DdTrace };
