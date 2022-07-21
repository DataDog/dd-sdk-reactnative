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
