import type { ConfigPlugin } from '@expo/config-plugins';
import { withPlugins } from '@expo/config-plugins';

import {
    ErrorTrackingOptions,
    getErrorTrackingPluginsFromOptions
} from './getErrorTrackingPluginsFromOptions';

const withDatadog: ConfigPlugin<ErrorTrackingOptions | void> = (
    config,
    options
) => {
    return withPlugins(config, getErrorTrackingPluginsFromOptions(options));
};

export default withDatadog;
