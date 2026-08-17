/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Published flagging-core 2.0.2 exports wire conversion from its package root. PR #344 moves
// that conversion to the opt-in `@datadog/flagging-core/configuration` entry point so the default
// entry point does not load Protobuf-ES. In both versions, the input is the complete portable JSON
// envelope. It is not the raw protobuf or legacy JSON response from the UFC service.
// Published `configurationFromString` is lenient: it returns an empty configuration
// (`{}`) for malformed input or an unsupported wire version rather than throwing.
// PR #344 preserves that failure as `configurationError` instead.
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
// through `5a5511e`.
// Import and re-export the wire functions and `FlagsConfigurationWire` type from
// `@datadog/flagging-core/configuration`. Do not use the deprecated package-root
// aliases because they parse precomputed data only and ignore rules. Keep
// `FlagsConfiguration` and the rules evaluator on the package root. The
// `@datadog/flagging-core/precomputed`
// subpath is protobuf-free, ignores rules, and is not the parser for this module.
// PR #336 through `dde93ea` adds browser providers and shared lifecycle error
// selection. Its latest commit removes unrelated `extraLogging` test coverage
// and does not change this core parser boundary. Do not import
// `@datadog/openfeature-browser` in React Native.
// Use `FlagsConfiguration.rules`. The distribution layer must put one base64
// encoding of the raw dd-source#34959 protobuf response in the version 1
// `rules.response` field. Record dd-source#40304 commit `071c4ad` as the schema
// revision and dd-source#34959 as the service producer path. Do not add that
// service transport or envelope construction here. PR #344 preserves decoded
// protobuf flags and integers. Its evaluator reports invalid reached data,
// unsupported feature levels, and unsafe integer conversion as deterministic
// flag-scoped `PARSE_ERROR` results. It also validates membership ordering,
// semantic-version bounds, and 32-byte SHA-256 digests.
type PendingRulesConfiguration = FlagsConfiguration & {
    configurationError?: string;
    rulesError?: string;
    rulesBased?: {
        response: UniversalFlagConfigurationV1;
        fetchedAt?: number;
        etag?: string;
    };
};

const INVALID_CONFIGURATION_WIRE_ERROR =
    'Invalid flags configuration wire format';
const INVALID_RULES_WIRE_ENTRY_ERROR = 'Invalid rules configuration wire entry';
const INVALID_RULES_RESPONSE_ERROR =
    'Rules configuration response could not be decoded';

type PendingRulesWire = {
    version: 1;
    rulesBased?: {
        response: string;
        fetchedAt?: number;
        etag?: string;
    };
};

type PendingRulesWireResult =
    | { status: 'invalid-configuration' }
    | { status: 'no-rules' }
    | { status: 'invalid-rules' }
    | {
          status: 'rules';
          rules: NonNullable<PendingRulesWire['rulesBased']>;
      };

const readPendingRulesWire = (source: string): PendingRulesWireResult => {
    try {
        const wire = JSON.parse(source) as Partial<PendingRulesWire> | null;
        if (
            !wire ||
            typeof wire !== 'object' ||
            Array.isArray(wire) ||
            wire.version !== 1
        ) {
            return { status: 'invalid-configuration' };
        }
        if (wire.rulesBased === undefined) {
            return { status: 'no-rules' };
        }
        if (
            !wire.rulesBased ||
            typeof wire.rulesBased !== 'object' ||
            Array.isArray(wire.rulesBased) ||
            typeof wire.rulesBased.response !== 'string'
        ) {
            return { status: 'invalid-rules' };
        }

        return { status: 'rules', rules: wire.rulesBased };
    } catch {
        return { status: 'invalid-configuration' };
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
    // published parser must also include PR #344's unknown-field tolerance,
    // unknown-field serialization, and lossless integer parsing through
    // `5a5511e`. Its safe-integer conversion does not require global `BigInt`.
    // TODO(FFL-2837): Delete this parse-error compatibility behavior when the
    // dependency contains PR #344 through `5a5511e`. The upstream parser uses
    // `configurationError` for an invalid envelope and `rulesError` for an
    // invalid rules entry or response. It keeps a valid sibling branch.
    const pendingRules = readPendingRulesWire(source);
    if (pendingRules.status === 'invalid-configuration') {
        configuration.configurationError = INVALID_CONFIGURATION_WIRE_ERROR;
    } else if (pendingRules.status === 'invalid-rules') {
        configuration.rulesError = INVALID_RULES_WIRE_ENTRY_ERROR;
    } else if (pendingRules.status === 'rules') {
        try {
            configuration.rulesBased = {
                ...pendingRules.rules,
                response: JSON.parse(pendingRules.rules.response)
            };
        } catch {
            configuration.rulesError = INVALID_RULES_RESPONSE_ERROR;
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
    // types above after the dependency contains PR #344 through `5a5511e`.
    // The upstream serializer encodes generated protobuf
    // rules back to base64 and preserves unknown protobuf fields.
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
