/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ConfigPlugin } from '@expo/config-plugins';
import { withPlugins } from '@expo/config-plugins';

import {
    ErrorTrackingOptions,
    getErrorTrackingPluginsFromOptions
} from './getErrorTrackingPluginsFromOptions';

type PluginConfiguration =
    | {
          errorTracking?: ErrorTrackingOptions;
      }
    | undefined;

const withDatadog: ConfigPlugin<PluginConfiguration> = (config, options) => {
    return withPlugins(
        config,
        getErrorTrackingPluginsFromOptions(options && options.errorTracking)
    );
};

export default withDatadog;
