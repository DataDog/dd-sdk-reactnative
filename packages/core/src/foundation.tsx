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
    return this.nativeTrace.startSpan(operation, context, timestampMs);
  }

  finishSpan(spanId: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
    return this.nativeTrace.finishSpan(spanId, context, timestampMs);
  }

}

class DdRumWrapper implements DdRumType {

  private nativeRum: DdRumType = NativeModules.DdRum;

  startView(key: string, name: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
    return this.nativeRum.startView(key, name, context, timestampMs);
  }

  stopView(key: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
    return this.nativeRum.stopView(key, context, timestampMs);
  }

  startAction(type: string, name: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
    return this.nativeRum.startAction(type, name, context, timestampMs);
  }

  stopAction(context: object = {}, timestampMs: number = Date.now()): Promise<void> {
    return this.nativeRum.stopAction(context, timestampMs);
  }

  addAction(type: string, name: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
    return this.nativeRum.addAction(type, name, context, timestampMs);
  }

  startResource(key: string, method: string, url: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
    return this.nativeRum.startResource(key, method, url, context, timestampMs);
  }

  stopResource(key: string, statusCode: number, kind: string, size: number = -1, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
    return this.nativeRum.stopResource(key, statusCode, kind, size, context, timestampMs);
  }

  addError(message: string, source: string, stacktrace: string, context: object = {}, timestampMs: number = Date.now()): Promise<void> {
    let updatedContext: any = context;
    updatedContext["_dd.error.source_type"] = "react-native";
    return this.nativeRum.addError(message, source, stacktrace, updatedContext, timestampMs);
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
