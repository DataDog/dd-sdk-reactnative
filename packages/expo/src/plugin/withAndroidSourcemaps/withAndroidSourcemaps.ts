/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ConfigPlugin } from '@expo/config-plugins';
import { withAppBuildGradle } from '@expo/config-plugins';

const withAndroidSourcemaps: ConfigPlugin<void> = config => {
    return withAppBuildGradle(config, async config => {
        const appBuildGradle = config.modResults;
        if (appBuildGradle.contents.match('datadog-sourcemaps.gradle')) {
            return config;
        }

        appBuildGradle.contents = appBuildGradle.contents.replace(
            /react\.gradle\"\)/,
            `react.gradle")\napply from: "${require('path').dirname(
                require.resolve('@datadog/mobile-react-native/package.json')
            )}/datadog-sourcemaps.gradle"`
        );

        return config;
    });
};

export default withAndroidSourcemaps;
