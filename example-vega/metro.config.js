const path = require('path');
const exclusionList = require(
  require.resolve('metro-config/src/defaults/exclusionList', {
    paths: [__dirname],
  })
);
const escape = require('escape-string-regexp');
const pakVega = require('../packages/react-native-vega/package.json');
const pakCore = require('../packages/core/package.json');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');

const modules = Object.keys({
  ...pakVega.peerDependencies,
  ...pakCore.peerDependencies,
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
  resolver: {
    // Ensure all module lookups (including from packages/*) can find
    // react-native and other peer deps in example-vega's node_modules.
    nodeModulesPaths: [
      path.join(__dirname, 'node_modules'),
    ],

    // Exclude root node_modules copies of peer deps to avoid duplicates.
    blacklistRE: exclusionList(
      modules.map(
        m =>
          new RegExp(`^${escape(path.join(root, 'node_modules', m))}\\/.*$`),
      ),
    ),

    extraNodeModules: modules.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {}),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
