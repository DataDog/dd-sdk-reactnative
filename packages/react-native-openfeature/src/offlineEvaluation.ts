/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { configMatchesContext } from '@datadog/flagging-core';
import type {
    FlagsConfiguration,
    PrecomputedFlag
} from '@datadog/flagging-core';
import { InternalLog, SdkVerbosity } from '@datadog/mobile-react-native';
import type {
    EvaluationContext,
    FlagsClient,
    FlagDetails
} from '@datadog/mobile-react-native';
import { ErrorCode, OpenFeatureError } from '@openfeature/web-sdk';
import type {
    EvaluationContext as OFEvaluationContext,
    FlagValueType,
    JsonValue,
    Logger,
    ResolutionDetails
} from '@openfeature/web-sdk';

import { DatadogCoreProvider } from './datadogCoreProvider';

// Keep the bridge contract owned by FlagsClient; no OpenFeature dependency enters the core SDK.
type CreateEvaluator = Parameters<FlagsClient['__ddSetOfflineEvaluator']>[0];
type CompatibilityHelpers = Parameters<CreateEvaluator>[0];
type OfflineEvaluator = ReturnType<CreateEvaluator>;
type FlagCache = ReturnType<CompatibilityHelpers['decodePrecomputedFlags']>;
type FlagCacheEntry = FlagCache extends Map<string, infer Entry>
    ? Entry
    : never;

const logger: Logger = {
    debug: message => InternalLog.log(String(message), SdkVerbosity.DEBUG),
    info: message => InternalLog.log(String(message), SdkVerbosity.INFO),
    warn: message => InternalLog.log(String(message), SdkVerbosity.WARN),
    error: message => InternalLog.log(String(message), SdkVerbosity.ERROR)
};

/**
 * Compatibility adapter for the released offline provider. DatadogCoreProvider owns evaluation;
 * the named FlagsClient owns this adapter and native exposure/RUM delivery. Only the legacy
 * precomputed input/context normalization and native tracking representation are adapted here.
 */
export class OfflineEvaluation implements OfflineEvaluator {
    private readonly core = new DatadogCoreProvider();
    private readonly configuration: FlagsConfiguration;
    private precomputedFlags: FlagCache = new Map();
    private context: EvaluationContext = { targetingKey: '', attributes: {} };
    private coreContext: OFEvaluationContext = {};

    constructor(
        configuration: FlagsConfiguration,
        helpers: CompatibilityHelpers
    ) {
        this.configuration = { ...configuration };
        const precomputed = configuration.precomputed;
        if (precomputed) {
            try {
                this.precomputedFlags = helpers.decodePrecomputedFlags(
                    precomputed.response as Parameters<
                        CompatibilityHelpers['decodePrecomputedFlags']
                    >[0]
                );
                const flags: Record<
                    string,
                    PrecomputedFlag
                > = Object.fromEntries(
                    Array.from(this.precomputedFlags, ([key, flag]) => [
                        key,
                        {
                            allocationKey: flag.allocationKey,
                            variationKey: flag.variationKey,
                            // The released client checks the value's runtime type, including integer/float
                            // aliases and object-typed payloads containing primitives. Keep that behavior.
                            variationType: typeof flag.value as FlagValueType,
                            variationValue: flag.value as JsonValue,
                            reason: flag.reason,
                            doLog: flag.doLog
                        }
                    ])
                );
                this.configuration.precomputed = {
                    ...precomputed,
                    context: precomputed.context
                        ? toOpenFeatureContext(
                              helpers.normalizeWireContext(precomputed.context)
                          )
                        : undefined,
                    // The native decoder omits malformed entries; flagging-core's parser reports them.
                    flagErrors: precomputed.flagErrors,
                    response: {
                        data: {
                            attributes: {
                                createdAt:
                                    precomputed.response.data.attributes
                                        .createdAt,
                                flags
                            }
                        }
                    }
                };
            } catch (error) {
                // A malformed precomputed branch must not hide a usable rules branch.
                this.configuration.precomputed = undefined;
                this.configuration.precomputedError =
                    error instanceof Error ? error.message : String(error);
            }
        }
        this.core.setConfiguration(this.configuration);
    }

    reconcile(
        context: EvaluationContext | undefined,
        hasTargetingKey = typeof context?.targetingKey === 'string'
    ): ReturnType<OfflineEvaluator['reconcile']> {
        // An omitted override adopts the normalized embedded context. Rules-only configurations
        // must not invent an anonymous subject: missing and explicitly empty keys differ.
        const embedded = this.configuration.precomputed?.context;
        this.context =
            context ??
            (embedded
                ? {
                      targetingKey: embedded.targetingKey ?? '',
                      attributes: withoutTargetingKey(embedded)
                  }
                : { targetingKey: '', attributes: {} });
        const normalizedContext = toOpenFeatureContext(this.context);
        // Snapshot matching retains released normalization/adoption. Only rules fallback uses the
        // original subject presence; native tracking still receives the normalized context.
        this.coreContext =
            configMatchesContext(this.configuration, normalizedContext) ||
            hasTargetingKey === true
                ? normalizedContext
                : withoutTargetingKey(normalizedContext);
        try {
            // Synchronous validation preserves the offline provider's context-change lifecycle.
            this.core.onContextChange({}, this.coreContext);
            return { status: 'ready' };
        } catch (error) {
            const code =
                error instanceof OpenFeatureError
                    ? error.code
                    : ErrorCode.GENERAL;
            return {
                status: 'error',
                errorCode:
                    code === ErrorCode.INVALID_CONTEXT ||
                    code === ErrorCode.PROVIDER_NOT_READY ||
                    code === ErrorCode.PARSE_ERROR
                        ? code
                        : ErrorCode.GENERAL
            };
        }
    }

    evaluate<T>(
        key: string,
        defaultValue: T,
        type: FlagValueType
    ): {
        details: FlagDetails<T>;
        exposure?: { flag: FlagCacheEntry; context: EvaluationContext };
    } {
        const context = this.coreContext;
        const result = this.resolve(key, defaultValue, type, context);
        const allocationKey = result.flagMetadata?.allocationKey;
        const details: FlagDetails<T> = {
            key,
            value: result.value,
            reason: result.reason ?? 'UNKNOWN',
            variant: result.variant,
            allocationKey:
                typeof allocationKey === 'string' ? allocationKey : undefined,
            errorCode: result.errorCode,
            errorMessage: result.errorMessage
        };
        if (
            result.errorCode ||
            typeof allocationKey !== 'string' ||
            result.variant === undefined
        ) {
            return { details };
        }

        // Reuse original precomputed tracking metadata (including extraLogging and variationType).
        // A rules result has no native cache entry, so build the same native tracking shape from
        // the actual evaluated result, never from the fallback/default value.
        const precomputed = configMatchesContext(this.configuration, context)
            ? this.precomputedFlags.get(key)
            : undefined;
        const serialId = result.flagMetadata?.__dd_split_serial_id;
        const flag: FlagCacheEntry = precomputed ?? {
            key,
            value: result.value,
            allocationKey,
            variationKey: result.variant,
            variationType: type,
            variationValue:
                typeof result.value === 'object'
                    ? JSON.stringify(result.value)
                    : String(result.value),
            reason: result.reason ?? 'UNKNOWN',
            doLog: result.flagMetadata?.doLog === true,
            extraLogging: {},
            ...(typeof serialId === 'number'
                ? { serialId: String(serialId) }
                : {})
        };
        // Even doLog=false evaluations reach native code: RUM tracking is independent of exposures.
        return { details, exposure: { flag, context: this.context } };
    }

    private resolve<T>(
        key: string,
        defaultValue: T,
        type: FlagValueType,
        context: OFEvaluationContext
    ): ResolutionDetails<T> {
        // FlagsClient's typed getters guarantee the default's type. OpenFeature's object method
        // additionally relies on the caller's JSON shape, just as DatadogCoreProvider does.
        switch (type) {
            case 'boolean':
                return this.core.resolveBooleanEvaluation(
                    key,
                    defaultValue as boolean,
                    context,
                    logger
                ) as ResolutionDetails<T>;
            case 'string':
                return this.core.resolveStringEvaluation(
                    key,
                    defaultValue as string,
                    context,
                    logger
                ) as ResolutionDetails<T>;
            case 'number':
                return this.core.resolveNumberEvaluation(
                    key,
                    defaultValue as number,
                    context,
                    logger
                ) as ResolutionDetails<T>;
            case 'object':
                return this.core.resolveObjectEvaluation(
                    key,
                    defaultValue as JsonValue,
                    context,
                    logger
                ) as ResolutionDetails<T>;
        }
    }
}

function toOpenFeatureContext(context: EvaluationContext): OFEvaluationContext {
    return { ...context.attributes, targetingKey: context.targetingKey };
}

function withoutTargetingKey(
    context: OFEvaluationContext
): NonNullable<EvaluationContext['attributes']> {
    const { targetingKey, ...attributes } = context;
    // This context has already passed through FlagsClient's primitive-only normalization.
    return attributes as NonNullable<EvaluationContext['attributes']>;
}
