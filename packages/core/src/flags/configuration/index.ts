/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Module boundary for portable-configuration handling. The public entry point
// (`packages/core/src/index.tsx`) re-exports only the customer-facing surface —
// `configurationFromString`/`configurationToString` and the `ParsedFlagsConfiguration` type;
// the decoder and other helpers stay internal to this boundary. Keeping the surface contained
// here makes a future "port -> depend on a shared core" swap easier.

// TODO(FFL-2837): Re-export `getPrecomputedContext` from
// `@datadog/flagging-core` here after a flagging-core release contains
// DataDog/openfeature-js-client#344 through `78a0c14`, including merged PR #353.
// Also expose it from the
// public React Native SDK entry point for the OpenFeature package to consume.

export { configurationFromString, configurationToString } from './wire';
export {
    decodePrecomputedFlags,
    UnsupportedConfigurationError
} from './precomputed';
// `contextMatchesConfiguration` is intentionally NOT re-exported — it is an internal
// helper consumed directly by `FlagsClient` (see its import from `./configuration/context`).
export { normalizeWireContext } from './context';
export type {
    ParsedFlagsConfiguration,
    ParsedPrecomputedConfiguration,
    PrecomputedConfigurationResponse,
    PrecomputedFlag,
    WireEvaluationContext
} from './types';
