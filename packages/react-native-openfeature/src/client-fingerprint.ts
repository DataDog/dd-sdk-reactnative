/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { SUPPORTED_FLAGS_CAPABILITIES } from '@datadog/flagging-core';

import { version } from './version';

/** An opaque, versioned SDK compatibility value, not a user or device identity. */
export type ClientFingerprint = string;

const fingerprint: ClientFingerprint = JSON.stringify({
    version: 1,
    sdk: { name: 'react-native', version },
    capabilities: [...SUPPORTED_FLAGS_CAPABILITIES].sort()
});

/**
 * Describe this SDK and its capabilities as an opaque, versioned string.
 * Forward unchanged to an application server preparing a precomputed configuration;
 * do not parse or construct it in application code.
 * This identifies the SDK, not a user or device, and is not authentication.
 */
export function getClientFingerprint(): ClientFingerprint {
    return fingerprint;
}
