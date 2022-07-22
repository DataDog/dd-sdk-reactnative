import type { ConfigPlugin } from '@expo/config-plugins';

import withAndroidProguardMappingFiles from './withAndroidProguardMappingFiles/withAndroidProguardMappingFiles';
import withAndroidSourcemaps from './withAndroidSourcemaps/withAndroidSourcemaps';
import withIosDsyms from './withIosDsyms/withIosDsyms';
import withIosSourcemaps from './withIosSourcemaps/withIosSourcemaps';

export type ErrorTrackingOptions = {
    iosDsyms?: boolean;
    iosSourcemaps?: boolean;
    androidProguardMappingFiles?: boolean;
    androidSourcemaps?: boolean;
};

const ERROR_TRACKING_CONFIG_PLUGINS_MAP: Record<
    keyof ErrorTrackingOptions,
    ConfigPlugin<any>
> = {
    iosDsyms: withIosDsyms,
    iosSourcemaps: withIosSourcemaps,
    androidProguardMappingFiles: withAndroidProguardMappingFiles,
    androidSourcemaps: withAndroidSourcemaps
};

/**
 * By default, all plugins are enabled. To disable a plugin, you have to set it
 * to `false`.
 */
export const getErrorTrackingPluginsFromOptions = (
    options: ErrorTrackingOptions | void
): ConfigPlugin<any>[] => {
    const configPluginsKeys = (Object.keys(
        ERROR_TRACKING_CONFIG_PLUGINS_MAP
    ) as (keyof ErrorTrackingOptions)[]).filter(
        option => !options || options[option] !== false
    );

    return configPluginsKeys.map(key => ERROR_TRACKING_CONFIG_PLUGINS_MAP[key]);
};
