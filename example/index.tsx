import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import {
    DdSdkReactNative,
    DdSdkReactNativeConfiguration,
    DdLogs
} from 'dd-sdk-reactnative';

import { CLIENT_TOKEN, ENVIRONMENT, APPLICATION_ID } from './src/ddCredentials';

const config = new DdSdkReactNativeConfiguration(
    CLIENT_TOKEN,
    ENVIRONMENT,
    APPLICATION_ID,
    true,
    true
)

DdSdkReactNative.initialize(config).then(() => {

    DdLogs.info('The RN Sdk was properly initialized', {
        foo: 42,
        bar: 'xyz',
    })
});

AppRegistry.registerComponent(appName, () => App);
