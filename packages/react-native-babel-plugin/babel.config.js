module.exports = {
    presets: ['@babel/preset-typescript', '@babel/preset-react'],
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
                                    mode: 'reanimated'
                                },
                                {
                                    event: 'multiHandler',
                                    action: 'TAP',
                                    mode: 'reanimated'
                                }
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
