const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');

const escape = value => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

// The Datadog packages this app links from the monorepo. Their peer dependencies must resolve to
// this app's copies, not to the versions hoisted at the repository root.
const linkedPackages = [
  'core',
  'react-native-session-replay',
  'react-native-webview',
  'internal-testing-tools',
];

const modules = [
  ...new Set(
    linkedPackages.flatMap(name =>
      Object.keys(
        require(`../packages/${name}/package.json`).peerDependencies || {},
      ).filter(dependency => !dependency.startsWith('@datadog/')),
    ),
  ),
];

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  projectRoot: __dirname,
  watchFolders: [root],
  resolver: {
    blockList: modules.map(
      m => new RegExp(`^${escape(path.join(root, 'node_modules', m))}\\/.*$`),
    ),
    extraNodeModules: modules.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {}),
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['react-native', 'browser', 'require', 'default'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
