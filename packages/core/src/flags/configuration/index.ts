/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Module boundary for portable-configuration handling. The public entry point
// re-exports only the customer-facing surface; decoding and evaluation adapters
// stay internal to this boundary.

export { getPrecomputedContext } from '@datadog/flagging-core';
export { configurationFromString, configurationToString } from './wire';
export type { FlagsConfigurationWire } from './wire';
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
