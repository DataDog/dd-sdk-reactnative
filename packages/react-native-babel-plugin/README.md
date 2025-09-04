# Babel Plugin for React Native

The `@datadog/mobile-react-native-babel-plugin` enhances the Datadog React Native SDK by automatically enriching React components with contextual metadata. It helps improve the accuracy of features such as RUM event correlation, Session Replay, and UI tracking.

## Setup

**Note**: Make sure you’ve already integrated the [Datadog React Native SDK][1].

To install with NPM, run:

```sh
npm install @datadog/mobile-react-native-babel-plugin
```

To install with Yarn, run:

```sh
yarn add @datadog/mobile-react-native-babel-plugin
```

## Configure Babel

Add the plugin to your Babel configuration. Depending on your setup, you might be using a `babel.config.js`, `.babelrc`, or similar.

Example configuration:

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['@datadog/mobile-react-native-babel-plugin'] // <-- Add here
};
```

If you are currently using `actionNameAttribute` in your datadog SDK configuration, you'll need to also specify it here:

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      '@datadog/mobile-react-native-babel-plugin',
      {actionNameAttribute: 'custom-prop-value'},
    ],
  ],
};
```

For more recent React Native versions this should be all that is needed. However, if you're on an older version and using Typescript in your project, you may need to install the preset `@babel/preset-typescript`.

To install with NPM, run:

```sh
npm install @babel/preset-typescript
```

To install with Yarn, run:

```sh
yarn add @babel/preset-typescript 
```

Then update your Babel configuration file like using the following example:

```js
module.exports = {
  presets: [
    'module:@react-native/babel-preset',
    '@babel/preset-typescript' // <-- Add here
  ],
  plugins: ['@datadog/mobile-react-native-babel-plugin']
};
```

[1]: https://www.npmjs.com/package/@datadog/mobile-react-native
