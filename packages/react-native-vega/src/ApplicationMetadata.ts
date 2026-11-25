/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { KeplerTurboModule } from '@amazon-devices/keplerscript-turbomodule-api';
import { TurboModuleRegistry } from '@amazon-devices/keplerscript-turbomodule-api';
import { version as sdkVersion } from '@datadog/mobile-react-native/internal';

interface DeviceInfo extends KeplerTurboModule {
    getConstants(): { bundleId?: unknown; appVersion?: unknown };
}

type MetadataConfiguration = {
    service?: string;
    version?: string;
    versionSuffix?: string;
    additionalConfiguration?: Record<string, unknown>;
};
const nonBlank = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined;
const platformValue = (value: unknown): string | undefined => {
    const text = nonBlank(value);
    return text?.toLowerCase() === 'unknown' ? undefined : text;
};

/** Reads existing platform constants on use, with no device-info npm dependency. */
export const buildApplicationMetadata = <T extends MetadataConfiguration>(
    configuration: T
) => {
    let service = nonBlank(configuration.service);
    let version = nonBlank(configuration.version);
    if (!service || !version) {
        try {
            const constants = TurboModuleRegistry.get<DeviceInfo>(
                'DeviceInfoModule'
            )?.getConstants();
            service ??= platformValue(constants?.bundleId);
            version ??= platformValue(constants?.appVersion);
        } catch {
            // Missing platform metadata must not prevent SDK setup.
        }
    }
    const additionalConfiguration = {
        ...configuration.additionalConfiguration,
        '_dd.source': 'react-native',
        '_dd.sdk_version': sdkVersion
    } as Record<string, unknown>;
    delete additionalConfiguration['_dd.version'];
    delete additionalConfiguration['_dd.version_suffix'];
    const suffix = nonBlank(configuration.versionSuffix);
    if (version) {
        additionalConfiguration['_dd.version'] = `${version}${
            suffix ? `-${suffix}` : ''
        }`;
    } else if (suffix) {
        additionalConfiguration['_dd.version_suffix'] = `-${suffix}`;
    }
    return {
        ...configuration,
        service: service ?? 'vega',
        version,
        additionalConfiguration
    };
};
