const path = require('path');

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Used by Group H in the SVG test screen to verify aliased imports
    // (e.g. '@assets/star.svg') resolve both at runtime (via this plugin
    // rewriting the import) and in buildSvgMap's static scan (RUM-12185).
    ['module-resolver', {
      root: ['./src'],
      alias: {
        '@assets': './src/scenario/SessionReplay/component/assets',
        // H2/H3 alias into @react-native/debugger-frontend (a real,
        // non-workspace npm dependency -- NOT a yarn-workspace symlink,
        // so its file path genuinely contains 'node_modules'). This matters
        // because the Babel plugin explicitly skips any file under
        // node_modules (index.ts), so RNSvgHandler never independently
        // wraps these icons' own <Svg> tag the way it does for in-project
        // assets/*.svg -- localSvgMap/pathAliasResolver is the ONLY thing
        // that can make these show up wrapped in Session Replay, which is
        // what actually exercises the aliasing fix (RUM-12185).
        //
        // H2: alias maps straight to a file -- the specifier itself carries
        // no '.svg' extension, exercising buildSvgMap's extensionless-alias path.
        '@heart-logo': './node_modules/@react-native/debugger-frontend/dist/third-party/front_end/Images/checkmark.svg',
        // H3: alias substitute is an absolute path rather than one relative to
        // the importing file, exercising buildSvgMap's absolute-alias path.
        '@absoluteAssets': path.resolve(__dirname, 'node_modules/@react-native/debugger-frontend/dist/third-party/front_end/Images')
      }
    }],
    ['@datadog/mobile-react-native-babel-plugin', {
      sessionReplay: {
        svgTracking: true
      }
    }]
  ]
};
