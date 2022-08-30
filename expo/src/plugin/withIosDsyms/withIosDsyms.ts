/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ConfigPlugin } from '@expo/config-plugins';
import { withXcodeProject } from '@expo/config-plugins';

const BUILD_PHASE_NAME = 'Upload dSYMs to Datadog';

const withIosDsyms: ConfigPlugin<void> = config => {
    return withXcodeProject(config, async config => {
        const xcodeProject = config.modResults;
        const buildPhase = xcodeProject.pbxItemByComment(
            BUILD_PHASE_NAME,
            'PBXShellScriptBuildPhase'
        );
        if (buildPhase) {
            return config;
        }

        xcodeProject.addBuildPhase(
            [],
            'PBXShellScriptBuildPhase',
            BUILD_PHASE_NAME,
            null /* target */,
            {
                shellScript: `set -e\\n yarn datadog-ci dsyms upload $DWARF_DSYM_FOLDER_PATH`,
                shellPath: '/bin/sh'
            }
        );

        return config;
    });
};

export default withIosDsyms;
