/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Rules parsing is intentionally opt-in. The flagging-core package root parser
// handles only precomputed data and does not load the Protobuf-ES runtime.
export {
    configurationFromString,
    configurationToString
} from '@datadog/flagging-core/rules-based';
export type { FlagsConfigurationWire } from '@datadog/flagging-core/rules-based';
