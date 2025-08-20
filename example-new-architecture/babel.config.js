module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      '@datadog/mobile-react-native-babel-plugin',
      {
        actionNameAttribute: 'custom-prop-value',
        components: {
          prefixName: true,
          uesContent: true,
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
              uesContent: false,
              handlers: [{event: 'onPress', action: 'TAP'}],
            },
            {
              name: 'TextInput',
              handlers: [{event: 'onFocus', action: 'TAP'}],
            },
            {
              name: 'Tab',
              // contentProp: 'subtitle',
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
