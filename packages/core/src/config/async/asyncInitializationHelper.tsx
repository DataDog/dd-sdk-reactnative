/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { CoreConfiguration } from '../features/CoreConfiguration';
import { LogsConfiguration } from '../features/LogsConfiguration';
import { RumConfiguration } from '../features/RumConfiguration';

import type { AutoInstrumentationConfiguration } from './AutoInstrumentationConfiguration';
import type { PartialInitializationConfiguration } from './PartialInitializationConfiguration';

export const buildConfigurationFromPartialConfiguration = (
    features: AutoInstrumentationConfiguration,
    configuration: PartialInitializationConfiguration
): CoreConfiguration => {
    const { clientToken, env } = configuration;

    const coreConfiguration = new CoreConfiguration(
        clientToken,
        env,
        configuration.trackingConsent,
        configuration
    );

    // RUM
    if (configuration.rumConfiguration?.applicationId !== undefined) {
        coreConfiguration.rumConfiguration = new RumConfiguration(
            configuration.rumConfiguration.applicationId,
            features.rumConfiguration.trackInteractions,
            features.rumConfiguration.trackResources,
            features.rumConfiguration.trackErrors,
            { ...features.rumConfiguration, ...configuration.rumConfiguration }
        );
    } else {
        console.warn(
            'DATADOG: Warning - Malformed RUM Configuration - `applicationId` is undefined'
        );
        coreConfiguration.rumConfiguration = undefined;
    }

    // Logs
    if (features.logsConfiguration.logEventMapper) {
        coreConfiguration.logsConfiguration = new LogsConfiguration({
            ...configuration.logsConfiguration,
            logEventMapper: features.logsConfiguration.logEventMapper
        });
    }

    return coreConfiguration;
};
