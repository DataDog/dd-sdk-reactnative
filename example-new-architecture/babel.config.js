module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      '@datadog/mobile-react-native-babel-plugin',
      {
        actionNameAttribute: 'custom-title',
        components: {
          useContent: true,
          useNamePrefix: true,
          tracked: [
            {
              name: 'GestureButton',
              useContent: false,
              useNamePrefix: false,
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
              // contentProp: 'subtitle',
              handlers: [{event: 'onChange', action: 'TAP'}],
            },
            {
              name: 'ButtonRNUI',
              useContent: false,
              handlers: [{event: 'onPress', action: 'TAP'}],
            },
            {
              name: 'TabsControlled',
              handlers: [{event: 'onChange', action: 'TAP'}],
            },

            {
              name: 'TabChild',
              handlers: [],
            },
          ],
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
