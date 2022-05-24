/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';
import { DdSdkConfiguration, DdSdkType, DdLogsType, DdTraceType, DdRumType } from './types';
import {InternalLog} from "./InternalLog"
import {SdkVerbosity} from "./SdkVerbosity";
import {TimeProvider} from "./TimeProvider";
import { LoggerLevel } from './LoggerLevel';

const timeProvider = new TimeProvider();

class DdLogsWrapper implements DdLogsType {

    private nativeLogs: DdLogsType = NativeModules.DdLogs;
    private level: LoggerLevel = LoggerLevel.DEBUG;

    setLevel(level: LoggerLevel): void {
        this.level = level;
    }

    debug(message: string, context: object = {}): Promise<void> {
        const isLogged = this.level <= LoggerLevel.DEBUG;
        InternalLog.log(`Debug log “${message}” ${isLogged ? '' : 'not '}tracked`, SdkVerbosity.DEBUG);

        if(!isLogged) {
            return new Promise(resolve => resolve());
        }
        return this.nativeLogs.debug(message, context);
    }

    info(message: string, context: object = {}): Promise<void> {
        const isLogged = this.level <= LoggerLevel.INFO;
        InternalLog.log(`Info log “${message}” ${isLogged ? '' : 'not '}tracked`, SdkVerbosity.DEBUG);

        if(!isLogged) {
            return new Promise(resolve => resolve());
        }
        return this.nativeLogs.info(message, context);
    }

    warn(message: string, context: object = {}): Promise<void> {
        const isLogged = this.level <= LoggerLevel.WARN;
        InternalLog.log(`Warn log “${message}” ${isLogged ? '' : 'not '}tracked`, SdkVerbosity.DEBUG);

        if(!isLogged) {
            return new Promise(resolve => resolve());
        }
        return this.nativeLogs.warn(message, context);
    }

    error(message: string, context: object = {}): Promise<void> {
        const isLogged = this.level <= LoggerLevel.ERROR;
        InternalLog.log(`Error log “${message}” ${isLogged ? '' : 'not '}tracked`, SdkVerbosity.DEBUG);

        if(!isLogged) {
            return new Promise(resolve => resolve());
        }
        return this.nativeLogs.error(message, context);
    }

}

class DdTraceWrapper implements DdTraceType {

    private nativeTrace: DdTraceType = NativeModules.DdTrace;

    startSpan(operation: string, context: object = {}, timestampMs: number = timeProvider.now()): Promise<string> {
        let spanId = this.nativeTrace.startSpan(operation, context, timestampMs);
        InternalLog.log("Starting span “" +  operation + "” #" + spanId, SdkVerbosity.DEBUG);
        return spanId
    }

    finishSpan(spanId: string, context: object = {}, timestampMs: number = timeProvider.now()): Promise<void> {
        InternalLog.log("Finishing span #" +  spanId, SdkVerbosity.DEBUG);
        return this.nativeTrace.finishSpan(spanId, context, timestampMs);
    }
}

class DdRumWrapper implements DdRumType {

    private nativeRum: DdRumType = NativeModules.DdRum;

    startView(key: string, name: string, context: object = {}, timestampMs: number = timeProvider.now()): Promise<void> {
        InternalLog.log("Starting RUM View “" +  name + "” #" + key, SdkVerbosity.DEBUG);
        return this.nativeRum.startView(key, name, context, timestampMs);
    }

    stopView(key: string, context: object = {}, timestampMs: number = timeProvider.now()): Promise<void> {
        InternalLog.log("Stopping RUM View #" + key, SdkVerbosity.DEBUG);
        return this.nativeRum.stopView(key, context, timestampMs);
    }

    startAction(type: string, name: string, context: object = {}, timestampMs: number = timeProvider.now()): Promise<void> {
        InternalLog.log("Starting RUM Action “" + name + "” (" + type + ")", SdkVerbosity.DEBUG);
        return this.nativeRum.startAction(type, name, context, timestampMs);
    }

    stopAction(context: object = {}, timestampMs: number = timeProvider.now()): Promise<void> {
        InternalLog.log("Stopping current RUM Action", SdkVerbosity.DEBUG);
        return this.nativeRum.stopAction(context, timestampMs);
    }

    addAction(type: string, name: string, context: object = {}, timestampMs: number = timeProvider.now()): Promise<void> {
        InternalLog.log("Adding RUM Action “" + name + "” (" + type + ")", SdkVerbosity.DEBUG);
        return this.nativeRum.addAction(type, name, context, timestampMs);
    }

    startResource(key: string, method: string, url: string, context: object = {}, timestampMs: number = timeProvider.now()): Promise<void> {
        InternalLog.log("Starting RUM Resource #" + key + " " + method + ": " + url, SdkVerbosity.DEBUG);
        return this.nativeRum.startResource(key, method, url, context, timestampMs);
    }

    stopResource(key: string, statusCode: number, kind: string, size: number = -1, context: object = {}, timestampMs: number = timeProvider.now()): Promise<void> {
        InternalLog.log("Stopping RUM Resource #" + key + " status:" + statusCode, SdkVerbosity.DEBUG);
        return this.nativeRum.stopResource(key, statusCode, kind, size, context, timestampMs);
    }

    addError(message: string, source: string, stacktrace: string, context: object = {}, timestampMs: number = timeProvider.now()): Promise<void> {
        InternalLog.log("Adding RUM Error “" + message + "”", SdkVerbosity.DEBUG);
        let updatedContext: any = context;
        updatedContext["_dd.error.source_type"] = "react-native";
        return this.nativeRum.addError(message, source, stacktrace, updatedContext, timestampMs);
    }

    addTiming(name: string): Promise<void> {
        InternalLog.log("Adding timing “" + name + "” to RUM View", SdkVerbosity.DEBUG);
        return this.nativeRum.addTiming(name);
    }
}

const DdSdk: DdSdkType = NativeModules.DdSdk;
const DdLogs: DdLogsType = new DdLogsWrapper();
const DdTrace: DdTraceType = new DdTraceWrapper();
const DdRum: DdRumType = new DdRumWrapper();

export { DdSdkConfiguration, DdSdk, DdLogs, DdTrace, DdRum };
