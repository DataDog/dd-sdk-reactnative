const path = require('path');

const aliasFixturePath = './src/scenario/SessionReplay/component/assets/alias-fixtures';
const aliasFixtureDir = path.resolve(__dirname, aliasFixturePath);

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module-resolver', {
      root: ['./src'],
      alias: {
        '@assets': './src/scenario/SessionReplay/component/assets',
        // H2: extensionless import mapped directly to a repository-owned SVG.
        '@heart-logo': `${aliasFixturePath}/checkmark.svg`,
        // H3: absolute path to the same local fixture directory.
        '@absoluteAssets': aliasFixtureDir
      }
    }],
    ['@datadog/mobile-react-native-babel-plugin', {
      sessionReplay: {
        svgTracking: true
      }
    }]
  ],
  overrides: [{
    test: /[\\/]assets[\\/]alias-fixtures[\\/]/,
    // H2-H4 must be wrapped through the importing alias, rather than by
    // independently instrumenting the fixtures' generated <Svg> elements.
    plugins: [['@datadog/mobile-react-native-babel-plugin', {
      sessionReplay: {
        svgTracking: false
      }
    }]]
  }]
};
