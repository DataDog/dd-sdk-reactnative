module.exports = {
  presets: [
    'module:@react-native/babel-preset',
    '@babel/preset-typescript',
    '@babel/preset-react',
  ],
  plugins: ['@datadog/mobile-react-native-babel-plugin'],
};
