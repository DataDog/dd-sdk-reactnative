module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Used by Group H in the SVG test screen to verify aliased imports
    // (e.g. '@assets/star.svg') resolve both at runtime (via this plugin
    // rewriting the import) and in buildSvgMap's static scan (RUM-12185).
    ['module-resolver', {
      root: ['./src'],
      alias: {
        '@assets': './src/scenario/SessionReplay/component/assets'
      }
    }],
    ['@datadog/mobile-react-native-babel-plugin', {
      sessionReplay: {
        svgTracking: true
      }
    }]
  ]
};
