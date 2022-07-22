/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ConfigPlugin } from '@expo/config-plugins';
import { withAppBuildGradle } from '@expo/config-plugins';

import { GradlePluginDatadogSite } from '../pluginGlobalConfiguration';

const withAndroidProguardMappingFiles: ConfigPlugin<{
    site?: GradlePluginDatadogSite;
}> = (config, { site }) => {
    return withAppBuildGradle(config, config => {
        const appBuildGradle = config.modResults;
        if (
            appBuildGradle.contents.match(
                'com.datadoghq.dd-sdk-android-gradle-plugin'
            )
        ) {
            return config;
        }

        // Add the installation for the Android Gradle Plugin
        const installationBlock = [
            `plugins {`,
            `    id("com.datadoghq.dd-sdk-android-gradle-plugin") version "1.4.0"`,
            `}`,
            ``,
            `datadog {`,
            `    checkProjectDependencies = "none"`,
            getDatadogSiteLine(site),
            `}`,
            ``
        ].join('\n');
        appBuildGradle.contents = `${installationBlock}${appBuildGradle.contents}`;

        // Automate the plugin to run after each build
        const automationBlock = [
            `applicationVariants.all { variant ->`,
            `        if (project.tasks.findByName("minify\${variant.name.capitalize()}WithR8")) {`,
            `            tasks["minify\${variant.name.capitalize()}WithR8"].finalizedBy { tasks["uploadMapping\${variant.name.capitalize()}"] }`,
            `        }`,
            ``
        ].join('\n');
        appBuildGradle.contents = appBuildGradle.contents.replace(
            'applicationVariants.all { variant ->',
            automationBlock
        );

        return config;
    });
};

const getDatadogSiteLine = (datadogSite?: string) => {
    if (!datadogSite) return '';
    return `    site = "${datadogSite}"`;
};

export default withAndroidProguardMappingFiles;
