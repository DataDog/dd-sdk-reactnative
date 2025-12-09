#!/usr/bin/env node
/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const TAG = '[@datadog/mobile-react-native]';

const DOCS_LINK_RN =
    'https://docs.datadoghq.com/real_user_monitoring/application_monitoring/react_native/error_tracking/#use-datadog-metro-configuration';

const DOCS_LINK_EXPO =
    'https://docs.datadoghq.com/real_user_monitoring/error_tracking/mobile/expo/#use-datadog-expo-configuration';

function isExpoProject(projectRoot) {
    try {
        // Check if Expo is installed as a dependency in this project
        require.resolve('expo/package.json', { paths: [projectRoot] });
        return true;
    } catch {
        return false;
    }
}

function fileExists(p) {
    try {
        fs.accessSync(p);
        return true;
    } catch {
        return false;
    }
}

function main() {
    // Real app root (npm/yarn set INIT_CWD for lifecycle scripts)
    const projectRoot = process.env.INIT_CWD || process.cwd();
    const isExpo = isExpoProject(projectRoot);
    const DOCS_LINK = isExpo ? DOCS_LINK_EXPO : DOCS_LINK_RN;

    const metroConfigPath = path.join(projectRoot, 'metro.config.js');

    if (!fileExists(metroConfigPath)) {
        console.warn(
            `${TAG} No metro.config.js file found in the project root (${projectRoot}). ` +
                'The Datadog Debug ID will not be injected and sourcemap linkage may not work as expected.\n\n' +
                `See: ${DOCS_LINK}`
        );
        return;
    }

    const source = fs.readFileSync(metroConfigPath, 'utf8');

    // Heuristic: check that they import and use our helper
    const hasImport = source.includes('@datadog/mobile-react-native/metro');
    const usesRnHelper = source.includes('withDatadogMetroConfig(');
    const usesExpoHelper = source.includes('getDatadogExpoConfig(');

    if (!hasImport) {
        console.warn(
            `${TAG} Your metro.config.js does not import ` +
                "'@datadog/mobile-react-native/metro'. The Datadog Debug ID will not be injected " +
                'and sourcemap linkage may not work as expected.\n\n' +
                `See: ${DOCS_LINK}`
        );
        return;
    }

    // If both helpers are used, assume advanced setup (monorepo, etc.) and don’t complain.
    if (usesRnHelper && usesExpoHelper) {
        return;
    }

    if (isExpo) {
        // Expo project
        if (usesRnHelper && !usesExpoHelper) {
            console.warn(
                `${TAG} Expo project detected, but metro.config.js uses ` +
                    '`withDatadogMetroConfig`. For Expo projects you should use `getDatadogExpoConfig` instead. ' +
                    'The Datadog Debug ID may not be injected and sourcemap linkage may not work as expected.\n\n' +
                    `See: ${DOCS_LINK}`
            );
            return;
        }

        if (!usesExpoHelper) {
            console.warn(
                `${TAG} Expo project detected, but metro.config.js does not use ` +
                    '`getDatadogExpoConfig`. The Datadog Debug ID will not be injected and sourcemap linkage ' +
                    'may not work as expected.\n\n' +
                    `See: ${DOCS_LINK}`
            );
            return;
        }
    } else {
        // Vanilla React Native project
        if (usesExpoHelper && !usesRnHelper) {
            console.warn(
                `${TAG} React Native project detected, but metro.config.js uses ` +
                    '`getDatadogExpoConfig`. For vanilla React Native projects you should use `withDatadogMetroConfig` instead. ' +
                    'The Datadog Debug ID may not be injected and sourcemap linkage may not work as expected.\n\n' +
                    `See: ${DOCS_LINK}`
            );
            return;
        }

        if (!usesRnHelper) {
            console.warn(
                `${TAG} React Native project detected, but metro.config.js does not use ` +
                    '`withDatadogMetroConfig`. The Datadog Debug ID will not be injected and sourcemap linkage ' +
                    'may not work as expected.\n\n' +
                    `See: ${DOCS_LINK}`
            );
            return;
        }
    }
}

// Wrap everything so we **always** exit with code 0
(async () => {
    try {
        main();
    } catch (error) {
        try {
            console.warn(
                `${TAG} An error occurred while checking metro.config.js: ${error}`
            );
        } catch {
            // Ignore logging errors
        }
    } finally {
        // Force success exit code
        process.exit(0);
    }
})();
