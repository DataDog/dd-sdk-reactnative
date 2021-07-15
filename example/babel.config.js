const path = require('path');
const pakCore = require('../packages/core/package.json');
const pakNavigation = require('../packages/react-navigation/package.json');
const pakNativeNavigation = require('../packages/react-native-navigation/package.json');

module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          [pakCore.name]: path.join(__dirname, '../packages/core', pakCore.source),
          [pakNavigation.name]: path.join(__dirname, '../packages/react-navigation', pakNavigation.source),
          [pakNativeNavigation.name]: path.join(__dirname, '../packages/react-native-navigation', pakNativeNavigation.source),
        },
      },
    ]
  ],
};
