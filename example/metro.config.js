const path = require('path');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const escape = require('escape-string-regexp');
const pakCore = require('../packages/core/package.json');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withDatadogMetroConfig } = require('@datadog/mobile-react-native/metro');

const root = path.resolve(__dirname, '..');

const modules = Object.keys({
    ...pakCore.peerDependencies
});

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
    projectRoot: __dirname,
    watchFolders: [root],
    resetCache: true,
    // We need to make sure that only one version is loaded for peerDependencies
    // So we blacklist them at the root, and alias them to the versions in example's node_modules
    // This block is very important, because otherwise things like React can be packed multiple times
    // while it should be only one React instance in the runtime. exclusionList relies on the modules which are
    // declared as peer dependencies in the core package.
    resolver: {
        blacklistRE: exclusionList(
            modules.map(
                m =>
                    new RegExp(
                        `^${escape(path.join(root, 'node_modules', m))}\\/.*$`
                    )
            )
        ),

        extraNodeModules: modules.reduce((acc, name) => {
            acc[name] = path.join(__dirname, 'node_modules', name);
            return acc;
        }, {}),

        unstable_enablePackageExports: true,
        unstable_conditionNames: ['react-native', 'browser', 'require', 'default']
    }
};

module.exports = withDatadogMetroConfig(mergeConfig(getDefaultConfig(__dirname), config));
