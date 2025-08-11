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
                                { event: 'singleHandler', action: 'TAP' },
                                { event: 'multiHandler', action: 'TAP' }
                            ]
                        }
                    ],
                    ignored: [
                        {
                            name: 'FakeButton',
                            importSource: 'react-native'
                        }
                    ]
                }
            }
        ]
    ]
};
