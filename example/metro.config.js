const path = require('path');
const blacklist = require('metro-config/src/defaults/blacklist');
const escape = require('escape-string-regexp');
const pakCore = require('../packages/core/package.json');

const root = path.resolve(__dirname, '..')

const modules = Object.keys({
  ...pakCore.peerDependencies,
});

module.exports = {
  projectRoot: __dirname,
  watchFolders: [root],

  // We need to make sure that only one version is loaded for peerDependencies
  // So we blacklist them at the root, and alias them to the versions in example's node_modules
  // This block is very important, because otherwise things like React can be packed multiple times
  // while it should be only one React instance in the runtime. Blacklist relies on the modules which are
  // declared as peer dependencies in the core package.
  resolver: {
    blacklistRE: blacklist(
      modules.map(
        (m) =>
          new RegExp(`^${escape(path.join(root, 'node_modules', m))}\\/.*$`)
      )
    ),

    extraNodeModules: modules.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {}),
  },

  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
