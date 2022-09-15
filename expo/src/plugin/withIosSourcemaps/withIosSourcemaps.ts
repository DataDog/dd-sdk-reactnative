/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ConfigPlugin } from '@expo/config-plugins';
import { withXcodeProject } from '@expo/config-plugins';

const withIosSourcemaps: ConfigPlugin<void> = config => {
    return withXcodeProject(config, async config => {
        const xcodeProject = config.modResults;
        const bundlePhase = xcodeProject.pbxItemByComment(
            'Bundle React Native code and images',
            'PBXShellScriptBuildPhase'
        );
        if (bundlePhase.shellScript.match('datadog-ci react-native xcode')) {
            return config;
        }

        const [beforeScript, afterScript] = bundlePhase.shellScript.split(
            "`node --print \\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\"`"
        );
        const datadogScript = `export SOURCEMAP_FILE=./main.jsbundle.map\\n yarn datadog-ci react-native xcode \`node --print \\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\"\``;
        bundlePhase.shellScript = `${beforeScript}${datadogScript}${afterScript}`;

        return config;
    });
};

export default withIosSourcemaps;
