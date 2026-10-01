const path = require('path');
const pakCore = require('../packages/core/package.json');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const escape = require('escape-string-regexp');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

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
const defaultConfig = getDefaultConfig(__dirname);

const config = {
    projectRoot: __dirname,
    watchFolders: [
        root
    ],
    resetCache: true,
    // Route .svg files through react-native-svg-transformer so they are importable
    // as React components (used by Session Replay SVG file-import test cases).
    transformer: {
        babelTransformerPath: require.resolve('react-native-svg-transformer')
    },
    // We need to make sure that only one version is loaded for peerDependencies
    // So we denylist them at the root, and alias them to the versions in example's node_modules
    // This block is very important, because otherwise things like React can be packed multiple times
    // while it should be only one React instance in the runtime. exclusionList relies on the modules which are
    // declared as peer dependencies in the core package.
    resolver: {
        // The optional flags benchmark uses Protobuf-ES package subpath exports.
        unstable_enablePackageExports: true,
        resolveRequest: (context, moduleName, platform) => {
            // Keep the benchmark adapter and core on the same decoder instance.
            // Metro 0.81 otherwise selects core's bundled legacy sub-entrypoint.
            if (moduleName === '@datadog/flagging-core/rules-based' ||
                /^@bufbuild\/protobuf(?:\/|$)/.test(moduleName)) {
                return {
                    type: 'sourceFile',
                    filePath: require.resolve(moduleName, { paths: [path.dirname(context.originModulePath)] })
                };
            }
            return context.resolveRequest(context, moduleName, platform);
        },
        // Remove svg from asset extensions and add it to source extensions so Metro
        // sends it through the transformer rather than copying it as a static asset.
        assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
        sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],

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
        }, {})
    },
};

module.exports = mergeConfig(defaultConfig, config);
