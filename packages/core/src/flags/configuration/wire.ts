/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Wire (de)serialization is reused from `@datadog/flagging-core` (the canonical
// implementation) rather than reimplemented here. `configurationFromString` is lenient:
// it returns an empty configuration (`{}`) for malformed input or an unsupported wire
// version rather than throwing. `configurationToString` is the inverse (its fix from
// https://github.com/DataDog/openfeature-js-client/pull/331 shipped in flagging-core 2.0.0).
import {
    configurationFromString as coreConfigurationFromString,
    configurationToString as coreConfigurationToString
} from '@datadog/flagging-core';
import type {
    FlagsConfiguration,
    UniversalFlagConfigurationV1
} from '@datadog/flagging-core';

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

    // TODO(FFL-2837): Delete this JSON compatibility shim after
    // DataDog/openfeature-js-client#336 is published by flagging-core.
    const pendingRules = readPendingRulesWire(source);
    if (pendingRules) {
        try {
            configuration.rulesBased = {
                ...pendingRules,
                response: JSON.parse(pendingRules.response)
            };
        } catch {
            return {};
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
    const serialized = coreConfigurationToString(configuration);
    const pendingConfiguration = configuration as PendingRulesConfiguration;
    if (!pendingConfiguration.rulesBased) {
        return serialized;
    }

    // TODO(FFL-2837): Delete this JSON compatibility shim after
    // DataDog/openfeature-js-client#336 is published by flagging-core.
    const wire = JSON.parse(serialized) as PendingRulesWire;
    wire.rulesBased = {
        fetchedAt: pendingConfiguration.rulesBased.fetchedAt,
        etag: pendingConfiguration.rulesBased.etag,
        response: JSON.stringify(pendingConfiguration.rulesBased.response)
    };
    return JSON.stringify(wire);
};
