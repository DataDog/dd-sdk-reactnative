module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      '@datadog/mobile-react-native-babel-plugin',
      {
        actionNameAttribute: 'custom-prop-value',
        prefixComponentName: true,
        components: {
          tracked: [
            {
              name: 'GestureButton',
              handlers: [
                {
                  event: 'singleHandler',
                  action: 'TAP',
                },
                {
                  event: 'multiHandler',
                  action: 'TAP',
                },
              ],
            },
            {
              name: 'Button',
              handlers: [{event: 'onPress', action: 'TAP'}],
            },
            {
              name: 'TextInput',
              handlers: [{event: 'onFocus', action: 'TAP'}],
            },
            {
              name: 'Tab',
              handlers: [{event: 'onChange', action: 'TAP'}],
            },
            {
              name: 'ButtonRNUI',
              handlers: [{event: 'onPress', action: 'TAP'}],
            },
          ],
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
