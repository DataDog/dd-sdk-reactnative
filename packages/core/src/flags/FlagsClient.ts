/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../config/types/SdkVerbosity';
import type { DdNativeFlagsType } from '../nativeModulesTypes';

// Imported directly (not via the module index): context matching is an internal helper,
// used here only to detect a runtime context an offline precomputed configuration cannot honor.
import { contextMatchesConfiguration } from './configuration/context';
import { stringifyFlagValue } from './configuration/precomputed';
import {
    flaggingCoreRulesEngine,
    getNoopRulesLogger,
    prepareRulesConfiguration,
    toRulesEvaluationContext
} from './configuration/rules';
import type {
    RulesConfigurationResponse,
    RulesEngine,
    RulesLogger,
    RulesValueType
} from './configuration/rules';
import { decodePrecomputedFlags, normalizeWireContext } from './configuration';
import type {
    ParsedFlagsConfiguration,
    ParsedPrecomputedConfiguration
} from './configuration';
import { processEvaluationContext } from './internal';
import type { FlagCacheEntry, TrackableAssignment } from './internal';
import type { JsonValue, EvaluationContext, FlagDetails } from './types';

/**
 * Error codes an offline configuration result can carry:
 * - `INVALID_CONTEXT`: the active context does not match the precomputed snapshot.
 * - `PROVIDER_NOT_READY`: an offline operation ran with no configuration loaded.
 * - `GENERAL`: the loaded configuration is unusable (malformed/unsupported/undecodable).
 */
export type ConfigurationErrorCode =
    | 'INVALID_CONTEXT'
    | 'PROVIDER_NOT_READY'
    | 'GENERAL';

/**
 * Outcome of loading a configuration or reconciling it against the active evaluation context,
 * returned by the offline APIs ({@link FlagsClient.setConfiguration},
 * {@link FlagsClient.setEvaluationContextWithoutFetching},
 * {@link FlagsClient.resetEvaluationContextWithoutFetching}).
 *
 * `'ready'` means the configuration can be served against the active context; `'error'` carries
 * the precise reason so the OpenFeature provider surfaces the correct code and evaluation returns
 * that code with the coded default.
 *
 * @internal Consumers observe OpenFeature provider events/evaluation details, not this result.
 */
export type ConfigurationResult =
    | { status: 'ready' }
    | { status: 'error'; errorCode: ConfigurationErrorCode };

/**
 * The decoded outcome of the last loaded offline configuration. Load validity (`kind`) is stored
 * separately from context compatibility so that later context changes reconcile against a decoded
 * snapshot **without re-decoding** and can never promote an invalid load to a servable state.
 *
 * `'none'` = no offline configuration engaged (the online/fetch path, or nothing loaded yet).
 */
type LoadedBranch<T> =
    | { status: 'absent' }
    | { status: 'invalid'; errorMessage: string }
    | { status: 'ready'; value: T };

type LoadedPrecomputed = {
    configuration: ParsedPrecomputedConfiguration;
    flags: Map<string, FlagCacheEntry>;
    flagErrors: ReadonlyMap<string, string>;
};

const NO_FLAG_ERRORS: ReadonlyMap<string, string> = new Map();

type LoadedConfigurationState =
    | { kind: 'none' }
    | {
          kind: 'configuration';
          precomputed: LoadedBranch<LoadedPrecomputed>;
          rules: LoadedBranch<RulesConfigurationResponse>;
      };

// TODO(FFL-2837): Delete this legacy `rulesBased` compatibility shape after a
// flagging-core release contains DataDog/openfeature-js-client#344 through
// `41dff20`. Read
// `configuration.rules.response` directly. The configuration is already parsed
// from the complete portable envelope. Do not add raw-service-response handling
// or envelope construction to `FlagsClient`. PR #344 moves parsing to
// `@datadog/flagging-core/configuration`; keep that opt-in import in the local
// wire module and keep `FlagsClient` independent of the parser and Protobuf-ES.
// Keep `precomputedError` and `precomputed.flagErrors` when the released type
// provides them. Do not copy PR #336's precedence that blocks valid rules when
// `precomputedError` is present. The released evaluator must also include PR
// #344's deterministic per-flag `PARSE_ERROR` results, unknown-field tolerance,
// lossless protobuf integer parsing, and the required SHA-256 digest-length
// validation. The released evaluator must also either support integer and shard
// evaluation when global `BigInt` is unavailable or document `BigInt` as a
// runtime requirement. The smoke test in `41dff20` does not cover those paths.
// `FlagsClient` must not convert a parsed `bigint` or repair an upstream
// `GENERAL` result. It must preserve the evaluator's `PARSE_ERROR` when a value
// cannot be represented safely as a JavaScript number.
type ConfigurationWithPendingRules = ParsedFlagsConfiguration & {
    rulesBased?: { response?: unknown };
    precomputedError?: string;
    precomputed?: ParsedPrecomputedConfiguration & {
        flagErrors?: Record<string, string>;
    };
};

export class FlagsClient {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeFlags: DdNativeFlagsType = require('../specs/NativeDdFlags')
        .default;

    private readonly rulesEngine: RulesEngine = flaggingCoreRulesEngine;

    private clientName: string;

    // The context the app explicitly set — the online fetch context, or the offline override via
    // {@link setEvaluationContextWithoutFetching}. `undefined` means "no external override": an
    // offline precomputed configuration is then served against its own embedded context. Tracked
    // separately from {@link evaluationContext} so that adopting a configuration's embedded context
    // is never mistaken for an app-set override (which would spuriously fail a later replacement).
    private externalContext: EvaluationContext | undefined = undefined;

    // The effective context evaluation and exposure tracking run against: the external override
    // when set, otherwise the loaded configuration's embedded context.
    private evaluationContext: EvaluationContext | undefined = undefined;

    // The servable flag cache. On the online path it holds the native-fetched flags; on the
    // offline path it mirrors the decoded snapshot when the configuration is servable. A Map
    // (not a plain object) so a flag keyed like an inherited property ("toString",
    // "__proto__") is looked up as data via `.get()` and never resolves an `Object.prototype`
    // member — important now the cache can be fed from untrusted wire data.
    private flagsCache: Map<string, FlagCacheEntry> = new Map();

    // The decoded outcome of the last loaded offline configuration (see the type).
    private loadedConfiguration: LoadedConfigurationState = { kind: 'none' };

    // Internal serving status. `'none'` = online path (serve `flagsCache`); `'ready'` = serve
    // the offline snapshot; `'error'` = serve coded defaults with `configurationError`.
    private configurationStatus: 'none' | 'ready' | 'error' = 'none';

    private configurationError:
        | { errorCode: ConfigurationErrorCode; errorMessage: string }
        | undefined = undefined;

    constructor(clientName: string = 'default') {
        this.clientName = clientName;
    }

    /**
     * Sets the evaluation context for the client.
     *
     * Should be called before evaluating any flags. Otherwise, the client will fall back to serving default flag values.
     *
     * Throws an error if there is an error setting the evaluation context and logs an error message.
     *
     * @param context The evaluation context to associate with the current client.
     *
     * @example
     * ```ts
     * const flagsClient = DdFlags.getClient();
     *
     * await flagsClient.setEvaluationContext({
     *     targetingKey: 'user-123',
     *     attributes: {
     *         favoriteFruit: 'apple'
     *     }
     * });
     *
     * const flagValue = flagsClient.getBooleanValue('new-feature', false);
     * ```
     */
    setEvaluationContext = async (
        context: EvaluationContext
    ): Promise<void> => {
        // Make sure to process the incoming context because we don't support nested object values in context.
        const processedContext = processEvaluationContext(context);

        // Entering online mode drops any offline overlay *before* fetching, so a failed fetch falls
        // back to coded defaults rather than continuing to serve a stale offline snapshot. Using one
        // client for both online and offline is unsupported (give the offline provider its own
        // `clientName`), so warn when an offline configuration is discarded here. Online-only clients
        // have no overlay, so this does not touch their keep-last-known-flags-on-failure behavior.
        if (this.loadedConfiguration.kind !== 'none') {
            InternalLog.log(
                `An offline configuration was loaded for '${this.clientName}' but an online fetch was requested; discarding it and serving default values on failure. Use a separate client for the offline provider.`,
                SdkVerbosity.WARN
            );
            this.loadedConfiguration = { kind: 'none' };
            this.configurationStatus = 'none';
            this.configurationError = undefined;
            this.flagsCache = new Map();
            this.evaluationContext = undefined;
            this.externalContext = undefined;
        }

        try {
            const result = await this.nativeFlags.setEvaluationContext(
                this.clientName,
                processedContext.targetingKey,
                processedContext.attributes ?? {}
            );

            this.externalContext = processedContext;
            this.evaluationContext = processedContext;
            this.flagsCache = new Map(Object.entries(result));

            // A successful online fetch is authoritative: reset to the clean online state so a
            // prior offline error status (e.g. PROVIDER_NOT_READY from an offline op with no
            // configuration loaded) can't keep serving coded defaults over the fetched flags.
            this.loadedConfiguration = { kind: 'none' };
            this.configurationStatus = 'none';
            this.configurationError = undefined;
        } catch (error) {
            // A failed fetch leaves the previous online cache in place (keep-last-known); any offline
            // overlay was already dropped above, so no stale offline snapshot is served.
            if (error instanceof Error) {
                InternalLog.log(
                    `Error setting flag evaluation context: ${error.message}`,
                    SdkVerbosity.WARN
                );
            }

            throw error;
        }
    };

    /**
     * Set the evaluation context **without** fetching a configuration from the network, then
     * reconcile the loaded configuration against it.
     *
     * The offline counterpart to {@link setEvaluationContext}: records the active context and
     * reconciles with no native request. A precomputed configuration is single-subject, so a
     * context that does not match the one it was computed for reconciles to an error
     * (`INVALID_CONTEXT`) and evaluation serves defaults. With no configuration loaded the
     * result is `PROVIDER_NOT_READY`. Intended for offline providers that own their
     * configuration via `setConfiguration` and must not fetch on a context change.
     *
     * @param context The evaluation context to associate with the current client.
     */
    setEvaluationContextWithoutFetching = (
        context: EvaluationContext
    ): ConfigurationResult => {
        this.externalContext = processEvaluationContext(context);

        return this.reconcile();
    };

    /**
     * Clear any externally-set evaluation context and reconcile.
     *
     * This is an explicit low-level Datadog reset operation. It drops the external override so a
     * loaded precomputed configuration is served against **its embedded context** again. It does
     * not represent OpenFeature `clearContext()`, which supplies the resulting effective context
     * to a provider. With no configuration loaded the result is `PROVIDER_NOT_READY`.
     */
    resetEvaluationContextWithoutFetching = (): ConfigurationResult => {
        this.externalContext = undefined;

        return this.reconcile();
    };

    /**
     * Load a configuration (parsed from a complete portable `FlagsConfigurationWire` via
     * `configurationFromString`) into the client for offline evaluation, then reconcile it
     * against the active context.
     *
     * For a precomputed configuration this decodes the snapshot once and adopts its embedded
     * evaluation context when none is set — **no network request is made**. An unusable
     * configuration reconciles to an error (`GENERAL`); a context mismatch to `INVALID_CONTEXT`.
     *
     * @param configuration The configuration to load.
     *
     * @example
     * ```ts
     * const configuration = configurationFromString(wire);
     * flagsClient.setConfiguration(configuration);
     *
     * const value = flagsClient.getBooleanValue('new-feature', false);
     * ```
     */
    setConfiguration = (
        configuration: ParsedFlagsConfiguration
    ): ConfigurationResult => {
        this.loadedConfiguration = this.loadConfiguration(configuration);

        return this.reconcile();
    };

    /**
     * Decode a supplied configuration into a {@link LoadedConfigurationState} **once**, capturing
     * whether the load itself is valid (independent of the active context). Later context changes
     * reconcile against this stored state without re-decoding, and can never turn an invalid load
     * into a servable one.
     *
     * Rules are handled before the precomputed guard. They are context-agnostic and must not be
     * classified as invalid when the precomputed branch has a context mismatch.
     */
    private loadConfiguration = (
        configuration: ParsedFlagsConfiguration
    ): LoadedConfigurationState => {
        const pendingConfiguration = configuration as ConfigurationWithPendingRules;
        const precomputed = pendingConfiguration?.precomputed;
        const rulesResponse = pendingConfiguration?.rulesBased?.response;

        let precomputedBranch: LoadedBranch<LoadedPrecomputed> = {
            status: 'absent'
        };
        if (pendingConfiguration.precomputedError !== undefined) {
            precomputedBranch = {
                status: 'invalid',
                errorMessage: pendingConfiguration.precomputedError
            };
        } else if (precomputed) {
            try {
                precomputedBranch = {
                    status: 'ready',
                    value: {
                        configuration: precomputed,
                        flags: decodePrecomputedFlags(precomputed.response),
                        flagErrors: new Map(
                            Object.entries(precomputed.flagErrors ?? {})
                        )
                    }
                };
            } catch (error) {
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : 'The precomputed configuration is not valid.';
                InternalLog.log(
                    `Unsupported precomputed configuration for '${this.clientName}': ${errorMessage}`,
                    SdkVerbosity.WARN
                );
                precomputedBranch = { status: 'invalid', errorMessage };
            }
        }

        let rulesBranch: LoadedBranch<RulesConfigurationResponse> = {
            status: 'absent'
        };
        if (rulesResponse !== undefined) {
            const prepared = prepareRulesConfiguration(rulesResponse);
            rulesBranch =
                prepared.status === 'ready'
                    ? {
                          status: 'ready',
                          value: prepared.configuration
                      }
                    : {
                          status: 'invalid',
                          errorMessage: prepared.errorMessage
                      };
        }

        return {
            kind: 'configuration',
            precomputed: precomputedBranch,
            rules: rulesBranch
        };
    };

    /**
     * Reconcile the stored {@link LoadedConfigurationState} against the active evaluation context
     * and (re)compute the servable flag cache and configuration status/result.
     *
     * The stored load validity is consulted **before** context compatibility, so a context change
     * can never promote an invalid (or absent) load to `ready`.
     */
    private reconcile = (): ConfigurationResult => {
        const loaded = this.loadedConfiguration;

        // No offline configuration engaged: an offline operation with nothing loaded is not ready.
        if (loaded.kind === 'none') {
            return this.enterError(
                'PROVIDER_NOT_READY',
                `The evaluation context is not usable for '${this.clientName}': no configuration is loaded. Provide a configuration via setConfiguration.`
            );
        }

        const { precomputed, rules } = loaded;

        if (
            precomputed.status === 'ready' &&
            (!this.externalContext ||
                contextMatchesConfiguration(
                    precomputed.value.configuration.context,
                    this.externalContext
                ))
        ) {
            this.evaluationContext =
                this.externalContext ??
                this.embeddedContext(precomputed.value.configuration);
            this.flagsCache = precomputed.value.flags;
            return this.enterReady();
        }

        if (rules.status === 'ready') {
            // The public SDK context currently requires a targeting key, but the
            // rules evaluator distinguishes a missing key from an empty key.
            const contextWithoutTargetingKey = {
                attributes: {}
            } as EvaluationContext;
            this.evaluationContext =
                this.externalContext ?? contextWithoutTargetingKey;
            this.flagsCache = new Map();
            return this.enterReady();
        }

        if (rules.status === 'invalid') {
            return this.enterError(
                'GENERAL',
                `The rules configuration for '${this.clientName}' is not usable: ${rules.errorMessage}`
            );
        }

        if (precomputed.status === 'invalid') {
            return this.enterError(
                'GENERAL',
                `The precomputed configuration for '${this.clientName}' is not usable: ${precomputed.errorMessage}`
            );
        }

        if (precomputed.status === 'ready') {
            return this.enterError(
                'INVALID_CONTEXT',
                `The evaluation context does not match the precomputed configuration for '${this.clientName}'. Serving default values. Set a matching context, or use a rules-based configuration for per-context evaluation.`
            );
        }

        return this.enterError(
            'GENERAL',
            `The loaded configuration for '${this.clientName}' does not contain a usable branch.`
        );
    };

    /** The evaluation context a precomputed configuration was computed for (empty if agnostic). */
    private embeddedContext = (
        configuration: ParsedPrecomputedConfiguration
    ): EvaluationContext => {
        return configuration.context
            ? normalizeWireContext(configuration.context)
            : { targetingKey: '', attributes: {} };
    };

    private enterReady = (): ConfigurationResult => {
        this.configurationStatus = 'ready';
        this.configurationError = undefined;
        return { status: 'ready' };
    };

    /** Record an error status + message, clear the servable cache, and return the result. */
    private enterError = (
        errorCode: ConfigurationErrorCode,
        errorMessage: string
    ): ConfigurationResult => {
        this.flagsCache = new Map();
        this.configurationStatus = 'error';
        this.configurationError = { errorCode, errorMessage };
        InternalLog.log(errorMessage, SdkVerbosity.WARN);

        return { status: 'error', errorCode };
    };

    private track = (flag: TrackableAssignment, context: EvaluationContext) => {
        // A non-blocking call; don't await this.
        this.nativeFlags
            .trackEvaluation(
                this.clientName,
                flag.key,
                flag,
                context.targetingKey,
                context.attributes ?? {}
            )
            .catch(error => {
                if (error instanceof Error) {
                    InternalLog.log(
                        `Error tracking flag evaluation: ${error.message}`,
                        SdkVerbosity.WARN
                    );
                }
            });
    };

    private errorDetails = <T>(
        key: string,
        defaultValue: T,
        errorCode:
            | ConfigurationErrorCode
            | 'FLAG_NOT_FOUND'
            | 'PARSE_ERROR'
            | 'TARGETING_KEY_MISSING'
            | 'TYPE_MISMATCH',
        errorMessage?: string
    ): FlagDetails<T> => ({
        key,
        value: defaultValue,
        reason: 'ERROR',
        errorCode,
        errorMessage
    });

    private getCachedDetails = <T>(
        flags: Map<string, FlagCacheEntry>,
        flagErrors: ReadonlyMap<string, string>,
        context: EvaluationContext,
        key: string,
        defaultValue: T,
        type: RulesValueType
    ): FlagDetails<T> => {
        const flagError = flagErrors.get(key);
        if (flagError !== undefined) {
            return this.errorDetails(
                key,
                defaultValue,
                'PARSE_ERROR',
                flagError
            );
        }

        const flag = flags.get(key);

        if (!flag) {
            return this.errorDetails(key, defaultValue, 'FLAG_NOT_FOUND');
        }

        const actualType = typeof flag.value;
        if (actualType !== type) {
            return this.errorDetails(
                key,
                defaultValue,
                'TYPE_MISMATCH',
                `Flag "${key}" returned a value of type "${actualType}". Use the corresponding method instead of the one expecting "${type}".`
            );
        }

        this.track(flag, context);

        return {
            key: flag.key,
            value: flag.value as T,
            variant: flag.variationKey,
            allocationKey: flag.allocationKey,
            reason: flag.reason
        };
    };

    private normalizeRulesErrorCode = (
        errorCode: string
    ):
        | ConfigurationErrorCode
        | 'FLAG_NOT_FOUND'
        | 'PARSE_ERROR'
        | 'TARGETING_KEY_MISSING'
        | 'TYPE_MISMATCH' => {
        switch (errorCode) {
            case 'INVALID_CONTEXT':
            case 'PROVIDER_NOT_READY':
            case 'FLAG_NOT_FOUND':
            case 'PARSE_ERROR':
            case 'TARGETING_KEY_MISSING':
            case 'TYPE_MISMATCH':
                return errorCode;
            default:
                return 'GENERAL';
        }
    };

    private getRulesDetails = <T>(
        configuration: RulesConfigurationResponse,
        context: EvaluationContext,
        logger: RulesLogger,
        key: string,
        defaultValue: T,
        type: RulesValueType
    ): FlagDetails<T> => {
        const result = this.rulesEngine.evaluate({
            configuration,
            type,
            flagKey: key,
            defaultValue,
            context: toRulesEvaluationContext(context),
            logger
        } as never);

        if (result.errorCode) {
            return this.errorDetails(
                key,
                defaultValue,
                this.normalizeRulesErrorCode(result.errorCode),
                result.errorMessage
            );
        }

        const reason = result.reason ?? 'DEFAULT';
        const isAssigned =
            result.variant !== undefined &&
            result.metadata.allocationKey !== undefined &&
            reason !== 'DISABLED';

        if (isAssigned) {
            // Rules evaluations use the same native assignment bridge as online
            // and precomputed evaluations. The bridge still requires an
            // extraLogging object, but the rules response does not provide one.
            this.track(
                {
                    key,
                    value: result.value,
                    allocationKey: result.metadata.allocationKey as string,
                    variationKey: result.variant as string,
                    variationType: result.metadata.variationType ?? type,
                    variationValue: stringifyFlagValue(result.value),
                    reason,
                    doLog: result.metadata.doLog ?? false,
                    extraLogging: {}
                },
                context
            );
        }

        return {
            key,
            value: result.value as T,
            variant: result.variant,
            allocationKey: result.metadata.allocationKey,
            reason
        };
    };

    private getOfflineDetails = <T>(
        loaded: Extract<LoadedConfigurationState, { kind: 'configuration' }>,
        context: EvaluationContext,
        logger: RulesLogger,
        key: string,
        defaultValue: T,
        type: RulesValueType
    ): FlagDetails<T> => {
        if (
            loaded.precomputed.status === 'ready' &&
            contextMatchesConfiguration(
                loaded.precomputed.value.configuration.context,
                context
            )
        ) {
            return this.getCachedDetails(
                loaded.precomputed.value.flags,
                loaded.precomputed.value.flagErrors,
                context,
                key,
                defaultValue,
                type
            );
        }

        if (loaded.rules.status === 'ready') {
            return this.getRulesDetails(
                loaded.rules.value,
                context,
                logger,
                key,
                defaultValue,
                type
            );
        }

        if (loaded.rules.status === 'invalid') {
            return this.errorDetails(
                key,
                defaultValue,
                'GENERAL',
                loaded.rules.errorMessage
            );
        }

        if (loaded.precomputed.status === 'invalid') {
            return this.errorDetails(
                key,
                defaultValue,
                'GENERAL',
                loaded.precomputed.errorMessage
            );
        }

        if (loaded.precomputed.status === 'ready') {
            return this.errorDetails(
                key,
                defaultValue,
                'INVALID_CONTEXT',
                `The evaluation context does not match the precomputed configuration for '${this.clientName}'.`
            );
        }

        return this.errorDetails(
            key,
            defaultValue,
            'GENERAL',
            `The loaded configuration for '${this.clientName}' does not contain a usable branch.`
        );
    };

    private getDetails = <T>(
        key: string,
        defaultValue: T,
        type: RulesValueType,
        resolutionContext?: EvaluationContext,
        logger: RulesLogger = getNoopRulesLogger()
    ): FlagDetails<T> => {
        const effectiveContext =
            resolutionContext ?? this.externalContext ?? this.evaluationContext;

        if (
            this.loadedConfiguration.kind === 'configuration' &&
            effectiveContext
        ) {
            return this.getOfflineDetails(
                this.loadedConfiguration,
                effectiveContext,
                logger,
                key,
                defaultValue,
                type
            );
        }

        // An offline configuration that cannot be served against the active context surfaces the
        // precise error code (INVALID_CONTEXT / GENERAL / PROVIDER_NOT_READY) with the coded
        // default. The OpenFeature provider maps this to a PROVIDER_ERROR / ERROR state.
        if (this.configurationStatus === 'error' && this.configurationError) {
            return this.errorDetails(
                key,
                defaultValue,
                this.configurationError.errorCode,
                this.configurationError.errorMessage
            );
        }

        if (!effectiveContext) {
            return this.errorDetails(
                key,
                defaultValue,
                'PROVIDER_NOT_READY',
                `The evaluation context is not set for '${this.clientName}'. Please, set context before evaluating any flags.`
            );
        }

        return this.getCachedDetails(
            this.flagsCache,
            NO_FLAG_ERRORS,
            effectiveContext,
            key,
            defaultValue,
            type
        );
    };

    /**
     * Evaluate with the effective per-resolution context.
     *
     * @internal Used by the OpenFeature provider. It is not part of the public
     * FlagsClient API.
     */
    getDetailsForContext = <T>(
        key: string,
        defaultValue: T,
        type: RulesValueType,
        context: EvaluationContext,
        logger: RulesLogger
    ): FlagDetails<T> => {
        return this.getDetails(
            key,
            defaultValue,
            type,
            processEvaluationContext(context),
            logger
        );
    };

    /**
     * Evaluate a boolean feature flag with detailed evaluation information.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     */
    getBooleanDetails = (
        key: string,
        defaultValue: boolean
    ): FlagDetails<boolean> => {
        return this.getDetails(key, defaultValue, 'boolean');
    };

    /**
     * Evaluate a string feature flag with detailed evaluation information.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     */
    getStringDetails = (
        key: string,
        defaultValue: string
    ): FlagDetails<string> => {
        return this.getDetails(key, defaultValue, 'string');
    };

    /**
     * Evaluate a number feature flag with detailed evaluation information.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     */
    getNumberDetails = (
        key: string,
        defaultValue: number
    ): FlagDetails<number> => {
        return this.getDetails(key, defaultValue, 'number');
    };

    /**
     * Evaluate a JSON feature flag with detailed evaluation information.
     *
     * Even though the `defaultValue` is typed as `JsonValue`, the flag value should be a valid JSON object.
     * Please use other typed methods to evaluate flags with primitive values.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     */
    getObjectDetails = <T extends JsonValue>(
        key: string,
        defaultValue: T
    ): FlagDetails<T> => {
        return this.getDetails(key, defaultValue, 'object');
    };

    /**
     * Evaluate a boolean feature flag value.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     *
     * @example
     * ```ts
     * const isNewFeatureEnabled = flagsClient.getBooleanValue('new-feature-enabled', false);
     * ```
     */
    getBooleanValue = (key: string, defaultValue: boolean): boolean => {
        return this.getBooleanDetails(key, defaultValue).value;
    };

    /**
     * Evaluate a string feature flag value.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     *
     * @example
     * ```ts
     * const appTheme = flagsClient.getStringValue('app-theme', 'light');
     * ```
     */
    getStringValue = (key: string, defaultValue: string): string => {
        return this.getStringDetails(key, defaultValue).value;
    };

    /**
     * Evaluate a number feature flag value.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     *
     * @example
     * ```ts
     * const ctaButtonSize = flagsClient.getNumberValue('cta-button-size', 16);
     * ```
     */
    getNumberValue = (key: string, defaultValue: number): number => {
        return this.getNumberDetails(key, defaultValue).value;
    };

    /**
     * Evaluate an object feature flag value.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     *
     * @example
     * ```ts
     * const pageCalloutOptions = flagsClient.getObjectValue('page-callout', { color: 'purple', text: 'Woof!' });
     * ```
     */
    getObjectValue = <T extends JsonValue>(key: string, defaultValue: T): T => {
        return this.getObjectDetails(key, defaultValue).value;
    };
}
