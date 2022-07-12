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
                shellScript: `set -e\\n yarn datadog-ci dsyms upload $DWARF_DSYM_FOLDER_PATH`
            }
        );

        return config;
    });
};

export default withIosDsyms;
