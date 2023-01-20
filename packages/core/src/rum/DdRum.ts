/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { GestureResponderEvent } from 'react-native';
import { NativeModules } from 'react-native';

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';
import { TimeProvider } from '../TimeProvider';
import { DdSdk } from '../foundation';
import type { DdNativeRumType } from '../nativeModulesTypes';
import { bufferVoidNativeCall } from '../sdk/DatadogProvider/Buffer/bufferNativeCall';

import type { ActionEventMapper } from './eventMappers/actionEventMapper';
import { generateActionEventMapper } from './eventMappers/actionEventMapper';
import type { ErrorEventMapper } from './eventMappers/errorEventMapper';
import { generateErrorEventMapper } from './eventMappers/errorEventMapper';
import type { ResourceEventMapper } from './eventMappers/resourceEventMapper';
import { generateResourceEventMapper } from './eventMappers/resourceEventMapper';
import type {
    DdRumType,
    RumActionType,
    ResourceKind,
    ErrorSource
} from './types';

const timeProvider = new TimeProvider();

const generateEmptyPromise = () => new Promise<void>(resolve => resolve());

class DdRumWrapper implements DdRumType {
    private nativeRum: DdNativeRumType = NativeModules.DdRum;
    private lastActionData?: { type: RumActionType; name: string };
    private errorEventMapper = generateErrorEventMapper(undefined);
    private resourceEventMapper = generateResourceEventMapper(undefined);
    private actionEventMapper = generateActionEventMapper(undefined);

    startView(
        key: string,
        name: string,
        context: object = {},
        timestampMs: number = timeProvider.now()
    ): Promise<void> {
        InternalLog.log(
            `Starting RUM View “${name}” #${key}`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() =>
            this.nativeRum.startView(key, name, context, timestampMs)
        );
    }

    stopView(
        key: string,
        context: object = {},
        timestampMs: number = timeProvider.now()
    ): Promise<void> {
        InternalLog.log(`Stopping RUM View #${key}`, SdkVerbosity.DEBUG);
        return bufferVoidNativeCall(() =>
            this.nativeRum.stopView(key, context, timestampMs)
        );
    }

    startAction(
        type: RumActionType,
        name: string,
        context: object = {},
        timestampMs: number = timeProvider.now()
    ): Promise<void> {
        InternalLog.log(
            `Starting RUM Action “${name}” (${type})`,
            SdkVerbosity.DEBUG
        );
        this.lastActionData = { type, name };
        return bufferVoidNativeCall(() =>
            this.nativeRum.startAction(type, name, context, timestampMs)
        );
    }

    stopAction(
        ...args:
            | [
                  type: RumActionType,
                  name: string,
                  context?: object,
                  timestampMs?: number
              ]
            | [context?: object, timestampMs?: number]
    ): Promise<void> {
        InternalLog.log('Stopping current RUM Action', SdkVerbosity.DEBUG);
        const nativeCallArgs = this.getStopActionNativeCallArgs(args);
        this.lastActionData = undefined;
        if (!nativeCallArgs) {
            return generateEmptyPromise();
        }
        return this.callNativeStopAction(...nativeCallArgs);
    }

    private callNativeStopAction = (
        type: RumActionType,
        name: string,
        context: object,
        timestampMs: number
    ): Promise<void> => {
        const mappedEvent = this.actionEventMapper.applyEventMapper({
            type,
            name,
            context,
            timestampMs
        });
        if (!mappedEvent) {
            return bufferVoidNativeCall(() =>
                this.nativeRum.stopAction(
                    type,
                    name,
                    {
                        '_dd.action.drop_action': true
                    },
                    timestampMs
                )
            );
        }

        return bufferVoidNativeCall(() =>
            this.nativeRum.stopAction(
                mappedEvent.type,
                mappedEvent.name,
                mappedEvent.context,
                mappedEvent.timestampMs
            )
        );
    };

    private getStopActionNativeCallArgs = (
        args:
            | [
                  type: RumActionType,
                  name: string,
                  context?: object,
                  timestampMs?: number
              ]
            | [context?: object, timestampMs?: number]
    ):
        | [
              type: RumActionType,
              name: string,
              context: object,
              timestampMs: number
          ]
        | null => {
        if (isNewStopActionAPI(args)) {
            return [
                args[0],
                args[1],
                args[2] || {},
                args[3] || timeProvider.now()
            ];
        }
        if (isOldStopActionAPI(args)) {
            if (this.lastActionData) {
                DdSdk.telemetryDebug(
                    'DDdRum.stopAction called with the old signature'
                );
                const { type, name } = this.lastActionData;
                return [
                    type,
                    name,
                    args[0] || {},
                    args[1] || timeProvider.now()
                ];
            }
            InternalLog.log(
                'DdRum.startAction needs to be called before DdRum.stopAction',
                SdkVerbosity.WARN
            );
        } else {
            InternalLog.log(
                'DdRum.stopAction was called with wrong arguments',
                SdkVerbosity.WARN
            );
        }

        return null;
    };

    addAction(
        type: RumActionType,
        name: string,
        context: object = {},
        timestampMs: number = timeProvider.now(),
        actionContext?: GestureResponderEvent
    ): Promise<void> {
        const mappedEvent = this.actionEventMapper.applyEventMapper({
            type,
            name,
            context,
            timestampMs,
            actionContext
        });
        if (!mappedEvent) {
            return generateEmptyPromise();
        }
        InternalLog.log(
            `Adding RUM Action “${name}” (${type})`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() =>
            this.nativeRum.addAction(
                mappedEvent.type,
                mappedEvent.name,
                mappedEvent.context,
                mappedEvent.timestampMs
            )
        );
    }

    startResource(
        key: string,
        method: string,
        url: string,
        context: object = {},
        timestampMs: number = timeProvider.now()
    ): Promise<void> {
        InternalLog.log(
            `Starting RUM Resource #${key} ${method}: ${url}`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() =>
            this.nativeRum.startResource(key, method, url, context, timestampMs)
        );
    }

    stopResource(
        key: string,
        statusCode: number,
        kind: ResourceKind,
        size: number = -1,
        context: object = {},
        timestampMs: number = timeProvider.now(),
        resourceContext?: XMLHttpRequest
    ): Promise<void> {
        const mappedEvent = this.resourceEventMapper.applyEventMapper({
            key,
            statusCode,
            kind,
            size,
            context,
            timestampMs,
            resourceContext
        });
        if (!mappedEvent) {
            /**
             * To drop the resource we call `stopResource` and pass the `_dd.drop_resource` attribute in the context.
             * It will be picked up by the resource mappers we implement on the native side that will drop the resource.
             * This ensures we don't have any "started" resource left in memory on the native side.
             */
            return bufferVoidNativeCall(() =>
                this.nativeRum.stopResource(
                    key,
                    statusCode,
                    kind,
                    size,
                    {
                        '_dd.resource.drop_resource': true
                    },
                    timestampMs
                )
            );
        }

        InternalLog.log(
            `Stopping RUM Resource #${key} status:${statusCode}`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() =>
            this.nativeRum.stopResource(
                mappedEvent.key,
                mappedEvent.statusCode,
                mappedEvent.kind,
                mappedEvent.size,
                mappedEvent.context,
                mappedEvent.timestampMs
            )
        );
    }

    addError(
        message: string,
        source: ErrorSource,
        stacktrace: string,
        context: object = {},
        timestampMs: number = timeProvider.now()
    ): Promise<void> {
        const mappedEvent = this.errorEventMapper.applyEventMapper({
            message,
            source,
            stacktrace,
            context,
            timestampMs
        });
        if (!mappedEvent) {
            return generateEmptyPromise();
        }
        InternalLog.log(`Adding RUM Error “${message}”`, SdkVerbosity.DEBUG);
        const updatedContext: any = mappedEvent.context;
        updatedContext['_dd.error.source_type'] = 'react-native';
        return bufferVoidNativeCall(() =>
            this.nativeRum.addError(
                mappedEvent.message,
                mappedEvent.source,
                mappedEvent.stacktrace,
                updatedContext,
                mappedEvent.timestampMs
            )
        );
    }

    addTiming(name: string): Promise<void> {
        InternalLog.log(
            `Adding timing “${name}” to RUM View`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() => this.nativeRum.addTiming(name));
    }

    registerErrorEventMapper(errorEventMapper: ErrorEventMapper) {
        this.errorEventMapper = generateErrorEventMapper(errorEventMapper);
    }

    unregisterErrorEventMapper() {
        this.errorEventMapper = generateErrorEventMapper(undefined);
    }

    registerResourceEventMapper(resourceEventMapper: ResourceEventMapper) {
        this.resourceEventMapper = generateResourceEventMapper(
            resourceEventMapper
        );
    }

    unregisterResourceEventMapper() {
        this.resourceEventMapper = generateResourceEventMapper(undefined);
    }

    registerActionEventMapper(actionEventMapper: ActionEventMapper) {
        this.actionEventMapper = generateActionEventMapper(actionEventMapper);
    }

    unregisterActionEventMapper() {
        this.actionEventMapper = generateActionEventMapper(undefined);
    }
}

const isNewStopActionAPI = (
    args:
        | [
              type: RumActionType,
              name: string,
              context?: object,
              timestampMs?: number
          ]
        | [context?: object, timestampMs?: number]
): args is [
    type: RumActionType,
    name: string,
    context?: object,
    timestampMs?: number
] => {
    return typeof args[0] === 'string';
};

const isOldStopActionAPI = (
    args:
        | [
              type: RumActionType,
              name: string,
              context?: object,
              timestampMs?: number
          ]
        | [context?: object, timestampMs?: number]
): args is [context?: object, timestampMs?: number] => {
    return typeof args[0] === 'object' || typeof args[0] === 'undefined';
};

export const DdRum = new DdRumWrapper();
