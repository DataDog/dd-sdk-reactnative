/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { GestureResponderEvent } from 'react-native';

import { DdAttributes } from '../DdAttributes';
import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../config/types/SdkVerbosity';
import { debugId } from '../metro/debugIdResolver';
import type { DdNativeRumType } from '../nativeModulesTypes';
import { encodeAttributes } from '../sdk/AttributesEncoding/attributesEncoding';
import type { Attributes } from '../sdk/AttributesSingleton/types';
import { bufferVoidNativeCall } from '../sdk/DatadogProvider/Buffer/bufferNativeCall';
import { NativeDdSdk } from '../sdk/DdSdkInternal';
import { GlobalState } from '../sdk/GlobalState/GlobalState';
import type { ErrorSource, FeatureOperationFailure } from '../types';
import { getGlobalInstance } from '../utils/singletonUtils';
import { DefaultTimeProvider } from '../utils/time-provider/DefaultTimeProvider';
import type { TimeProvider } from '../utils/time-provider/TimeProvider';

import type { ActionEventMapper } from './eventMappers/actionEventMapper';
import { generateActionEventMapper } from './eventMappers/actionEventMapper';
import type { ErrorEventMapper } from './eventMappers/errorEventMapper';
import { generateErrorEventMapper } from './eventMappers/errorEventMapper';
import type { ResourceEventMapper } from './eventMappers/resourceEventMapper';
import { generateResourceEventMapper } from './eventMappers/resourceEventMapper';
import {
    clearCachedSessionId,
    getCachedAccountId,
    getCachedSessionId,
    getCachedUserId,
    setCachedSessionId
} from './helper';
import type { DatadogTracingContext } from './instrumentation/resourceTracking/distributedTracing/DatadogTracingContext';
import { DatadogTracingIdentifier } from './instrumentation/resourceTracking/distributedTracing/DatadogTracingIdentifier';
import { TracingIdentifier } from './instrumentation/resourceTracking/distributedTracing/TracingIdentifier';
import {
    getTracingContext,
    getTracingContextForPropagators
} from './instrumentation/resourceTracking/distributedTracing/distributedTracingHeaders';
import { getNativeDdRum } from '../specs/NativeDdRum';

import type {
    DdRumType,
    FirstPartyHost,
    PropagatorType,
    ResourceKind,
    RumActionType
} from './types';

const RUM_MODULE = 'com.datadog.reactnative.rum';

const generateEmptyPromise = () => new Promise<void>(resolve => resolve());

type TouchData = {
    reactTag: number;
    x: number;
    y: number;
    pageX: number;
    pageY: number;
};

const touchDataFromEvent = (
    event?: GestureResponderEvent
): TouchData | null => {
    const nativeEvent = event?.nativeEvent;
    if (!nativeEvent) {
        return null;
    }
    return {
        reactTag: Number(nativeEvent.target),
        x: nativeEvent.locationX,
        y: nativeEvent.locationY,
        pageX: nativeEvent.pageX,
        pageY: nativeEvent.pageY
    };
};

class DdRumWrapper implements DdRumType {
    private nativeRum: DdNativeRumType = getNativeDdRum() as DdNativeRumType;
    private lastActionData?: { type: RumActionType; name: string };
    private errorEventMapper = generateErrorEventMapper(undefined);
    private resourceEventMapper = generateResourceEventMapper(undefined);
    private actionEventMapper = generateActionEventMapper(undefined);
    private timeProvider: TimeProvider = new DefaultTimeProvider();

    startView = (
        key: string,
        name: string,
        context: object = {},
        timestampMs: number = this.timeProvider.now()
    ): Promise<void> => {
        InternalLog.log(
            `Starting RUM View “${name}” #${key}`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() =>
            this.nativeRum.startView(
                key,
                name,
                encodeAttributes(context),
                timestampMs
            )
        );
    };

    stopView = (
        key: string,
        context: object = {},
        timestampMs: number = this.timeProvider.now()
    ): Promise<void> => {
        InternalLog.log(`Stopping RUM View #${key}`, SdkVerbosity.DEBUG);
        return bufferVoidNativeCall(() =>
            this.nativeRum.stopView(key, encodeAttributes(context), timestampMs)
        );
    };

    startAction = (
        type: RumActionType,
        name: string,
        context: object = {},
        timestampMs: number = this.timeProvider.now()
    ): Promise<void> => {
        InternalLog.log(
            `Starting RUM Action “${name}” (${type})`,
            SdkVerbosity.DEBUG
        );
        this.lastActionData = { type, name };
        return bufferVoidNativeCall(() =>
            this.nativeRum.startAction(
                type,
                name,
                encodeAttributes(context),
                timestampMs
            )
        );
    };

    stopAction = (
        ...args:
            | [
                  type: RumActionType,
                  name: string,
                  context?: object,
                  timestampMs?: number
              ]
            | [context?: object, timestampMs?: number]
    ): Promise<void> => {
        InternalLog.log('Stopping current RUM Action', SdkVerbosity.DEBUG);
        const nativeCallArgs = this.getStopActionNativeCallArgs(args);
        this.lastActionData = undefined;
        if (!nativeCallArgs) {
            return generateEmptyPromise();
        }
        return this.callNativeStopAction(...nativeCallArgs);
    };

    startFeatureOperation(
        name: string,
        operationKey: string | null,
        attributes: object
    ): Promise<void> {
        InternalLog.log(
            `Starting feature operation “${name}” (${operationKey})`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() =>
            this.nativeRum.startFeatureOperation(name, operationKey, attributes)
        );
    }

    succeedFeatureOperation(
        name: string,
        operationKey: string | null,
        attributes: object
    ): Promise<void> {
        InternalLog.log(
            `Succeding feature operation “${name}” (${operationKey})`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() =>
            this.nativeRum.succeedFeatureOperation(
                name,
                operationKey,
                attributes
            )
        );
    }

    failFeatureOperation(
        name: string,
        operationKey: string | null,
        reason: FeatureOperationFailure,
        attributes: object
    ): Promise<void> {
        InternalLog.log(
            `Failing feature operation “${name}” (${operationKey})`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() =>
            this.nativeRum.failFeatureOperation(
                name,
                operationKey,
                reason,
                attributes
            )
        );
    }

    setTimeProvider = (timeProvider: TimeProvider): void => {
        this.timeProvider = timeProvider;
    };

    addAction = (
        type: RumActionType,
        name: string,
        context: object = {},
        timestampMs: number = this.timeProvider.now(),
        actionContext?: GestureResponderEvent
    ): Promise<void> => {
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
                touchDataFromEvent(mappedEvent.actionContext),
                encodeAttributes(mappedEvent.context),
                mappedEvent.timestampMs
            )
        );
    };

    startResource = (
        key: string,
        method: string,
        url: string,
        context: object = {},
        timestampMs: number = this.timeProvider.now()
    ): Promise<void> => {
        InternalLog.log(
            `Starting RUM Resource #${key} ${method}: ${url}`,
            SdkVerbosity.DEBUG
        );

        return bufferVoidNativeCall(() =>
            this.nativeRum.startResource(
                key,
                method,
                url,
                encodeAttributes(context),
                timestampMs
            )
        );
    };

    stopResource = (
        key: string,
        statusCode: number,
        kind: ResourceKind,
        size: number = -1,
        context: object = {},
        timestampMs: number = this.timeProvider.now(),
        resourceContext?: XMLHttpRequest
    ): Promise<void> => {
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
                encodeAttributes(mappedEvent.context),
                mappedEvent.timestampMs
            )
        );
    };

    addError = (
        message: string,
        source: ErrorSource,
        stacktrace: string,
        context: object = {},
        timestampMs: number = this.timeProvider.now(),
        fingerprint?: string
    ): Promise<void> => {
        const mappedEvent = this.errorEventMapper.applyEventMapper({
            message,
            source,
            stacktrace,
            context,
            timestampMs,
            fingerprint: fingerprint ?? ''
        });

        if (!mappedEvent) {
            return generateEmptyPromise();
        }
        InternalLog.log(`Adding RUM Error “${message}”`, SdkVerbosity.DEBUG);
        const updatedContext = encodeAttributes(mappedEvent.context);
        updatedContext[DdAttributes.errorSourceType] = 'react-native';

        if (debugId) {
            updatedContext[DdAttributes.debugId] = debugId;
        }

        return bufferVoidNativeCall(() =>
            this.nativeRum.addError(
                mappedEvent.message,
                mappedEvent.source,
                mappedEvent.stacktrace,
                updatedContext,
                mappedEvent.timestampMs,
                mappedEvent.fingerprint
            )
        );
    };

    addTiming = (name: string): Promise<void> => {
        InternalLog.log(
            `Adding timing “${name}” to RUM View`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() => this.nativeRum.addTiming(name));
    };

    addViewAttribute = (key: string, value: unknown): Promise<void> => {
        InternalLog.log(
            `Adding view attribute “${key}" with value “${JSON.stringify(
                value
            )}” to RUM View`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() =>
            this.nativeRum.addViewAttribute(key, { value })
        );
    };

    removeViewAttribute = (key: string): Promise<void> => {
        InternalLog.log(
            `Removing view attribute “${key}" from RUM View`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() =>
            this.nativeRum.removeViewAttribute(key)
        );
    };

    addViewAttributes = (attributes: Attributes): Promise<void> => {
        InternalLog.log(
            `Adding view attributes "${JSON.stringify(
                attributes
            )}” to RUM View`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() =>
            this.nativeRum.addViewAttributes(attributes)
        );
    };

    removeViewAttributes = (keys: string[]): Promise<void> => {
        InternalLog.log(
            `Removing view attributes “${keys}" from RUM View`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() =>
            this.nativeRum.removeViewAttributes(keys)
        );
    };

    addViewLoadingTime = (overwrite: boolean): Promise<void> => {
        InternalLog.log(
            overwrite
                ? 'Adding and overwriting view loading to RUM View'
                : 'Adding view loading to RUM View',
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() =>
            this.nativeRum.addViewLoadingTime(overwrite)
        );
    };

    stopSession = (): Promise<void> => {
        InternalLog.log('Stopping RUM Session', SdkVerbosity.DEBUG);
        clearCachedSessionId();
        return bufferVoidNativeCall(() => this.nativeRum.stopSession());
    };

    addFeatureFlagEvaluation = (
        name: string,
        value: unknown
    ): Promise<void> => {
        InternalLog.log(
            `Adding feature flag evaluation for name: ${name} with value: ${JSON.stringify(
                value
            )}`,
            SdkVerbosity.DEBUG
        );
        return bufferVoidNativeCall(() =>
            this.nativeRum.addFeatureFlagEvaluation(name, { value })
        );
    };

    async getCurrentSessionId(): Promise<string | undefined> {
        if (!GlobalState.isInitialized) {
            return undefined;
        }
        const sessionId = await this.nativeRum.getCurrentSessionId();
        if (sessionId) {
            setCachedSessionId(sessionId);
        }
        return sessionId;
    }

    getTracingContext = (
        url: string,
        tracingSamplingRate: number,
        firstPartyHosts: FirstPartyHost[]
    ): DatadogTracingContext => {
        return getTracingContext(
            url,
            tracingSamplingRate,
            firstPartyHosts,
            getCachedSessionId(),
            getCachedUserId(),
            getCachedAccountId()
        );
    };

    getTracingContextForPropagators = (
        propagators: PropagatorType[],
        tracingSamplingRate: number
    ): DatadogTracingContext => {
        return getTracingContextForPropagators(
            propagators,
            tracingSamplingRate,
            getCachedSessionId(),
            getCachedUserId(),
            getCachedAccountId()
        );
    };

    generateTraceId(): DatadogTracingIdentifier {
        return new DatadogTracingIdentifier(TracingIdentifier.createTraceId());
    }

    generateSpanId(): DatadogTracingIdentifier {
        return new DatadogTracingIdentifier(TracingIdentifier.createSpanId());
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
                encodeAttributes(mappedEvent.context),
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
                args[2] ?? {},
                args[3] || this.timeProvider.now()
            ];
        }
        if (isOldStopActionAPI(args)) {
            if (this.lastActionData) {
                NativeDdSdk.telemetryDebug(
                    'DDdRum.stopAction called with the old signature'
                );
                const { type, name } = this.lastActionData;
                return [
                    type,
                    name,
                    args[0] ?? {},
                    args[1] || this.timeProvider.now()
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

export const DdRum = getGlobalInstance(RUM_MODULE, () => new DdRumWrapper());
