import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { NativeModules } from 'react-native'
import {
    DdSdkReactNative,
    DdSdkReactNativeConfiguration,
    DdLogs,
    DdSdk
} from 'dd-sdk-reactnative';

import { CLIENT_TOKEN, ENVIRONMENT, APPLICATION_ID } from './src/ddCredentials';

const config = new DdSdkReactNativeConfiguration(
    CLIENT_TOKEN,
    ENVIRONMENT,
    APPLICATION_ID,
    true,
    true,
    true
)
config.nativeCrashReportEnabled = true
config.sampleRate = 100

DdSdkReactNative.initialize(config).then(() => {

    DdLogs.info('The RN Sdk was properly initialized', {
        foo: 42,
        bar: 'xyz',
    })

    DdSdk.setUser({id: "1337", name: "Xavier", email: "xg@example.com", type: "premium"})

    DdSdk.setAttributes({campaign: "react-native-bs"})
});

AppRegistry.registerComponent(appName, () => App);
