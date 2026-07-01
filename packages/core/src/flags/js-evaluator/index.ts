/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export { evaluate, unwrapConfiguration } from './evaluation';
export { md5 } from './md5';
export { regexMatches } from './regex';
export { semverMatches } from './semver';
export type {
    EvaluationContext,
    FlagValueType,
    JsonValue,
    ResolutionDetails,
    UniversalFlagConfiguration,
    UniversalFlagConfigurationResponse
} from './types';
