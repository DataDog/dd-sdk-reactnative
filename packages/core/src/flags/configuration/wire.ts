/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Published flagging-core 2.0.2 exports wire conversion from its package root. PR #344 moves
// that conversion to the opt-in `@datadog/flagging-core/configuration` entry point so the default
// entry point does not load Protobuf-ES. In both versions, the input is the complete portable JSON
// envelope. It is not the raw protobuf or legacy JSON response from the UFC service.
// `configurationFromString` is lenient: it returns an empty configuration (`{}`) for
// malformed input or an unsupported wire version rather than throwing.
// `configurationToString` is the inverse (its fix from
// https://github.com/DataDog/openfeature-js-client/pull/331 shipped in flagging-core 2.0.0).
import {
    configurationFromString as coreConfigurationFromString,
    configurationToString as coreConfigurationToString
} from '@datadog/flagging-core';
import type {
    FlagsConfiguration,
    UniversalFlagConfigurationV1
} from '@datadog/flagging-core';

// TODO(FFL-2837): Delete the pending `rulesBased` types, reader, and wrappers
// after a flagging-core release contains DataDog/openfeature-js-client#344
// through `41dff20`.
// Import and re-export the wire functions and `FlagsConfigurationWire` type from
// `@datadog/flagging-core/configuration`. Keep `FlagsConfiguration` and the rules
// evaluator on the package root. Use `FlagsConfiguration.rules`. The distribution
// layer must put one base64 encoding of the raw dd-source#34959 protobuf response
// in the version 1 `rules.response` field. Do not add that service transport or
// envelope construction here. PR #344 preserves decoded protobuf flags and
// protobuf integers. Its evaluator reports invalid reached data and unsafe
// integer conversion as deterministic `PARSE_ERROR` results.
type PendingRulesConfiguration = FlagsConfiguration & {
    rulesBased?: {
        response: UniversalFlagConfigurationV1;
        fetchedAt?: number;
        etag?: string;
    };
};

type PendingRulesWire = {
    version: 1;
    rulesBased?: {
        response: string;
        fetchedAt?: number;
        etag?: string;
    };
};

const readPendingRulesWire = (
    source: string
): PendingRulesWire['rulesBased'] | undefined => {
    try {
        const wire = JSON.parse(source) as PendingRulesWire;
        if (
            wire.version !== 1 ||
            !wire.rulesBased ||
            typeof wire.rulesBased.response !== 'string'
        ) {
            return undefined;
        }

        return wire.rulesBased;
    } catch {
        return undefined;
    }
};

/**
 * Use flagging-core to parse a configuration wire.
 */
export const configurationFromString = (source: string): FlagsConfiguration => {
    const configuration = coreConfigurationFromString(
        source
    ) as PendingRulesConfiguration;

    // TODO(FFL-2837): Delete this legacy JSON compatibility shim with the
    // pending types above. The upstream parser decodes `rules.response` as a
    // generated Protobuf-ES message. Do not adapt this shim to decode a raw
    // service response or to add a base64 layer. Do not copy the strict base64
    // validator that PR #344 removed in favor of the Protobuf-ES decoder. The
    // published parser must also include PR #344's unknown-field tolerance and
    // lossless integer parsing through `41dff20`.
    const pendingRules = readPendingRulesWire(source);
    if (pendingRules) {
        try {
            configuration.rulesBased = {
                ...pendingRules,
                response: JSON.parse(pendingRules.response)
            };
        } catch {
            return configuration;
        }
    }

    return configuration;
};

/**
 * Use flagging-core to serialize a parsed configuration.
 */
export const configurationToString = (
    configuration: FlagsConfiguration
): string => {
    const pendingConfiguration = configuration as PendingRulesConfiguration;

    // TODO(FFL-2837): Delete this legacy serialization wrapper with the pending
    // types above after the dependency contains PR #344 through `41dff20`.
    // The upstream serializer encodes generated protobuf rules back to base64.
    // This temporary UFC v1 shim serializes its legacy JSON response instead.
    if (pendingConfiguration.rulesBased) {
        const serialized = JSON.parse(
            coreConfigurationToString(configuration)
        ) as PendingRulesWire;
        serialized.rulesBased = {
            ...pendingConfiguration.rulesBased,
            response: JSON.stringify(pendingConfiguration.rulesBased.response)
        };
        return JSON.stringify(serialized);
    }

    return coreConfigurationToString(configuration);
};
