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
        const datadogScript = `export SOURCEMAP_FILE=./build/main.jsbundle.map\\n yarn datadog-ci react-native xcode \`node --print \\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\"\``;
        bundlePhase.shellScript = `${beforeScript}${datadogScript}${afterScript}`;

        return config;
    });
};

export default withIosSourcemaps;
