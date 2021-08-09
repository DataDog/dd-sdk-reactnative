/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';
import { DdSdkConfiguration, DdSdkType, DdLogsType, DdTraceType, DdRumType } from './types';

class DdLogsWrapper implements DdLogsType {

    private nativeLogs: DdLogsType = NativeModules.DdLogs;

    debug(message: string, context: object = {}): Promise<void> {
        return this.nativeLogs.debug(message, context);
    }
    info(message: string, context: object = {}): Promise<void> {
        return this.nativeLogs.info(message, context);
    }
    warn(message: string, context: object = {}): Promise<void> {
        return this.nativeLogs.warn(message, context);
    }
    error(message: string, context: object = {}): Promise<void> {
        return this.nativeLogs.error(message, context);
    }

}

class DdTraceWrapper implements DdTraceType {

    private nativeTrace: DdTraceType = NativeModules.DdTrace;

    startSpan(operation: string, context: object = {}, timestampMs: number = Date.now()): Promise<string> {
        // TODO swap context and stacktrace in the native call, requires native bridges update
        // @ts-ignore
        return this.nativeTrace.startSpan(operation, timestampMs, context);
    }
    finishSpan(spanId: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
        // TODO swap context and stacktrace in the native call, requires native bridges update
        // @ts-ignore
        return this.nativeTrace.finishSpan(spanId, timestampMs, context);
    }

}

class DdRumWrapper implements DdRumType {

    private nativeRum: DdRumType = NativeModules.DdRum;

    startView(key: string, name: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
        // TODO swap context and stacktrace in the native call, requires native bridges update
        // @ts-ignore
        return this.nativeRum.startView(key, name, timestampMs, context);
    }
    stopView(key: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
        // TODO swap context and stacktrace in the native call, requires native bridges update
        // @ts-ignore
        return this.nativeRum.stopView(key, timestampMs, context);
    }
    startAction(type: string, name: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
        // TODO swap context and stacktrace in the native call, requires native bridges update
        // @ts-ignore
        return this.nativeRum.startAction(type, name, timestampMs, context);
    }
    stopAction(context: object = {}, timestampMs: number = Date.now()): Promise<void> {
        // TODO swap context and stacktrace in the native call, requires native bridges update
        // @ts-ignore
        return this.nativeRum.stopAction(timestampMs, context);
    }
    addAction(type: string, name: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
        // TODO swap context and stacktrace in the native call, requires native bridges update
        // @ts-ignore
        return this.nativeRum.addAction(type, name, timestampMs, context);
    }
    startResource(key: string, method: string, url: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
        // TODO swap context and stacktrace in the native call, requires native bridges update
        // @ts-ignore
        return this.nativeRum.startResource(key, method, url, timestampMs, context);
    }
    stopResource(key: string, statusCode: number, kind: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
        // TODO swap context and stacktrace in the native call, requires native bridges update
        // @ts-ignore
        return this.nativeRum.stopResource(key, statusCode, kind, timestampMs, context);
    }
    addError(message: string, source: string, stacktrace: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
        // TODO swap context and stacktrace in the native call, requires native bridges update
        // @ts-ignore
        return this.nativeRum.addError(message, source, stacktrace, timestampMs, context);
    }
    addTiming(name: string): Promise<void> {
        return this.nativeRum.addTiming(name);
    }

}

const DdSdk: DdSdkType = NativeModules.DdSdk;
const DdLogs: DdLogsType = new DdLogsWrapper();
const DdTrace: DdTraceType = new DdTraceWrapper();
const DdRum: DdRumType = new DdRumWrapper();

export { DdSdkConfiguration, DdSdk, DdLogs, DdTrace, DdRum };
