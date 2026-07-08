module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['@datadog/mobile-react-native-babel-plugin', {
      sessionReplay: {
        svgTracking: true
      }
    }]
  ]
};
