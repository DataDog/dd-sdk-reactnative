/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { FirstPartyHostsConfiguration } from '../../DdSdkReactNativeConfiguration';
import {
    DatadogProviderConfiguration,
    DEFAULTS
} from '../../DdSdkReactNativeConfiguration';
import { SdkVerbosity } from '../../SdkVerbosity';
import { TrackingConsent } from '../../TrackingConsent';
import type { ActionEventMapper } from '../../rum/eventMappers/actionEventMapper';
import type { ErrorEventMapper } from '../../rum/eventMappers/errorEventMapper';
import type { ResourceEventMapper } from '../../rum/eventMappers/resourceEventMapper';
import { PropagatorType } from '../../rum/types';

export class FileBasedConfiguration extends DatadogProviderConfiguration {
    constructor(params?: {
        configuration?: unknown;
        errorEventMapper?: ErrorEventMapper;
        resourceEventMapper?: ResourceEventMapper;
        actionEventMapper?: ActionEventMapper;
    }) {
        const configuration = getJSONConfiguration(params?.configuration);
        super(
            configuration.clientToken,
            configuration.env,
            configuration.applicationId,
            configuration.trackInteractions,
            configuration.trackResources,
            configuration.trackErrors,
            configuration.trackingConsent
        );
        this.longTaskThresholdMs =
            configuration.longTaskThresholdMs || DEFAULTS.longTaskThresholdMs;
        this.verbosity = configuration.verbosity;
        this.actionNameAttribute = configuration.actionNameAttribute;
        this.resourceTracingSamplingRate =
            configuration.resourceTracingSamplingRate ||
            DEFAULTS.resourceTracingSamplingRate;
        this.firstPartyHosts =
            configuration.firstPartyHosts || DEFAULTS.getFirstPartyHosts();
        this.errorEventMapper =
            params?.errorEventMapper || DEFAULTS.errorEventMapper;
        this.resourceEventMapper =
            params?.resourceEventMapper || DEFAULTS.resourceEventMapper;
        this.actionEventMapper =
            params?.actionEventMapper || DEFAULTS.actionEventMapper;
    }
}

const resolveJSONConfiguration = (
    userSpecifiedConfiguration: unknown
): Record<string, any> => {
    if (
        userSpecifiedConfiguration === undefined ||
        userSpecifiedConfiguration === null
    ) {
        try {
            // This corresponds to a file located at the root of a RN project.
            // /!\ We have to write the require this way as dynamic requires are not supported by Hermes.
            // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
            const jsonContent = require('../../../../../../datadog-configuration.json');

            if (
                typeof jsonContent !== 'object' ||
                !jsonContent['configuration']
            ) {
                console.error(`Failed to parse the Datadog configuration file located at the root of the project.
Your configuration must validate the node_modules/@datadog/mobile-react-native/datadog-configuration.schema.json JSON schema.
You can use VSCode to check your configuration by adding the following line to your JSON file:
{
    "$schema": "./node_modules/@datadog/mobile-react-native/datadog-configuration.schema.json",
}`);

                return {};
            }

            return jsonContent.configuration as Record<string, any>;
        } catch (error) {
            console.error(`Failed to read Datadog configuration file at the root of the project.
If you don't have a datadog-configuration.json file at the same level as your node_modules directory,\
please use the following syntax:\n
new FileBasedConfiguration({configuration: require('./file/to/configuration-file.json')})
`);
            return {};
        }
    }
    if (
        typeof userSpecifiedConfiguration !== 'object' ||
        !(userSpecifiedConfiguration as any)['configuration']
    ) {
        console.error(`Failed to parse the Datadog configuration file you provided.
Your configuration must validate the node_modules/@datadog/mobile-react-native/datadog-configuration.schema.json JSON schema.
You can use VSCode to check your configuration by adding the following line to your JSON file:
{
    "$schema": "./node_modules/@datadog/mobile-react-native/datadog-configuration.schema.json",
}`);

        return {};
    }

    return (userSpecifiedConfiguration as any)['configuration'] as Record<
        string,
        any
    >;
};

export const getJSONConfiguration = (
    userSpecifiedConfiguration: unknown
): {
    clientToken: string;
    env: string;
    applicationId: string;
    trackInteractions: boolean | undefined;
    trackResources: boolean | undefined;
    trackErrors: boolean | undefined;
    trackingConsent: TrackingConsent | undefined;
    longTaskThresholdMs: number | undefined;
    verbosity: SdkVerbosity | undefined;
    actionNameAttribute: string | undefined;
    resourceTracingSamplingRate: number | undefined;
    firstPartyHosts: FirstPartyHostsConfiguration | undefined;
} => {
    const configuration = resolveJSONConfiguration(userSpecifiedConfiguration);

    return {
        clientToken: configuration.clientToken,
        env: configuration.env,
        applicationId: configuration.applicationId,
        trackInteractions: configuration.trackInteractions,
        trackResources: configuration.trackResources,
        trackErrors: configuration.trackErrors,
        trackingConsent: buildTrackingConsent(configuration.trackingConsent),
        longTaskThresholdMs: configuration.longTaskThresholdMs,
        verbosity: buildSdkVerbosity(configuration.verbosity),
        actionNameAttribute: configuration.actionNameAttribute,
        resourceTracingSamplingRate: configuration.resourceTracingSamplingRate,
        firstPartyHosts: buildFirstPartyHosts(configuration.firstPartyHosts)
    };
};

const buildFirstPartyHosts = (
    firstPartyHosts: { match: string; propagatorTypes: string[] }[] | undefined
): FirstPartyHostsConfiguration | undefined => {
    if (!firstPartyHosts) {
        return undefined;
    }

    try {
        return firstPartyHosts.map(({ match, propagatorTypes }) => ({
            match,
            propagatorTypes: propagatorTypes.map(formatPropagatorType)
        }));
    } catch (error) {
        console.error(`Failed to parse the first party hosts from the Datadog configuration file you provided:
${(error as any).message}
The first party hosts will not be set for this session.
`);
        return undefined;
    }
};

export const formatPropagatorType = (
    propagatorType: string
): PropagatorType => {
    switch (propagatorType.toLowerCase()) {
        case 'b3': {
            return PropagatorType.B3;
        }
        case 'b3multi': {
            return PropagatorType.B3MULTI;
        }
        case 'datadog': {
            return PropagatorType.DATADOG;
        }
        case 'tracecontext': {
            return PropagatorType.TRACECONTEXT;
        }
        default: {
            throw new Error(
                `Failed to parse propagator type ${propagatorType}.`
            );
        }
    }
};

const buildTrackingConsent = (
    trackingConsent: string | undefined
): TrackingConsent | undefined => {
    if (trackingConsent === undefined) {
        return undefined;
    }
    switch (trackingConsent.toLowerCase()) {
        case 'granted': {
            return TrackingConsent.GRANTED;
        }
        case 'pending': {
            return TrackingConsent.PENDING;
        }
        case 'not_granted': {
            return TrackingConsent.NOT_GRANTED;
        }
        default: {
            return DEFAULTS.trackingConsent;
        }
    }
};

const buildSdkVerbosity = (
    verbosity: string | undefined
): SdkVerbosity | undefined => {
    if (verbosity === undefined) {
        return undefined;
    }
    switch (verbosity.toLowerCase()) {
        case 'debug': {
            return SdkVerbosity.DEBUG;
        }
        case 'info': {
            return SdkVerbosity.INFO;
        }
        case 'warn': {
            return SdkVerbosity.WARN;
        }
        case 'error': {
            return SdkVerbosity.ERROR;
        }
        default: {
            return undefined;
        }
    }
};
