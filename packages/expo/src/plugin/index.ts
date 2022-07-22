import type { ConfigPlugin } from '@expo/config-plugins';
import { withPlugins } from '@expo/config-plugins';

import {
    ErrorTrackingOptions,
    getErrorTrackingPluginsFromOptions
} from './getErrorTrackingPluginsFromOptions';
import type { GradlePluginDatadogSite } from './pluginGlobalConfiguration';

type PluginConfiguration =
    | {
          site?: GradlePluginDatadogSite;
          errorTracking?: ErrorTrackingOptions;
      }
    | undefined;

const withDatadog: ConfigPlugin<PluginConfiguration> = (config, options) => {
    return withPlugins(
        config,
        getErrorTrackingPluginsFromOptions(options && options.errorTracking, {
            site: options && options.site
        })
    );
};

export default withDatadog;
