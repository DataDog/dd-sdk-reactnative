module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      '@datadog/mobile-react-native-babel-plugin',
      {
        actionNameAttribute: 'custom-prop-value',
        components: {
          tracked: [
            {
              name: 'GestureButton',
              importSource: 'local',
              handlers: [
                {
                  event: 'singleHandler',
                  action: 'TAP',
                  mode: 'reanimated',
                },
                {
                  event: 'multiHandler',
                  action: 'TAP',
                  mode: 'reanimated',
                },
              ],
            },
            {
              name: 'Button',
              importSource: '@gluestack-ui/themed',
              handlers: [{event: 'onPress', action: 'TAP'}],
            },
            {
              name: 'TextInput',
              importSource: 'react-native-paper',
              handlers: [{event: 'onFocus', action: 'TAP'}],
            },
            {
              name: 'Tab',
              importSource: '@rneui/themed',
              handlers: [{event: 'onChange', action: 'TAP'}],
            },
          ],
          ignored: [
            {
              name: 'FakeButton',
              importSource: 'react-native',
            },
          ],
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
