import type { ConfigPlugin, StaticPlugin } from '@expo/config-plugins';

import { GradlePluginDatadogSite } from './pluginGlobalConfiguration';
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

/**
 * By default, all plugins are enabled. To disable a plugin, you have to set it
 * to `false`.
 */
export const getErrorTrackingPluginsFromOptions = (
    options: ErrorTrackingOptions | void,
    params: { site?: GradlePluginDatadogSite }
): (ConfigPlugin<any> | StaticPlugin<any>)[] => {
    const ERROR_TRACKING_CONFIG_PLUGINS_MAP: Record<
        keyof ErrorTrackingOptions,
        ConfigPlugin<any> | StaticPlugin<any>
    > = {
        iosDsyms: withIosDsyms,
        iosSourcemaps: withIosSourcemaps,
        androidProguardMappingFiles: [
            withAndroidProguardMappingFiles,
            { site: params.site }
        ],
        androidSourcemaps: withAndroidSourcemaps
    };

    const configPluginsKeys = (Object.keys(
        ERROR_TRACKING_CONFIG_PLUGINS_MAP
    ) as (keyof ErrorTrackingOptions)[]).filter(
        option => !options || options[option] !== false
    );

    return configPluginsKeys.map(key => ERROR_TRACKING_CONFIG_PLUGINS_MAP[key]);
};
