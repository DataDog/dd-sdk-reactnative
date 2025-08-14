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
                            handlers: [
                                {
                                    event: 'singleHandler',
                                    action: 'TAP'
                                },
                                {
                                    event: 'multiHandler',
                                    action: 'TAP'
                                }
                            ]
                        },
                        {
                            name: 'Tab',
                            handlers: [{ event: 'onChange', action: 'TAP' }]
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
