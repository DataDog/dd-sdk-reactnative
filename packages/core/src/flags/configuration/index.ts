/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Internal module boundary for portable-configuration handling. Intentionally NOT
// re-exported from the package's public entry point (`packages/core/src/index.tsx`)
// until the exports step (FFL-2690). Keeping the surface behind this boundary makes a
// future "port -> depend on a shared core" swap contained.

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
