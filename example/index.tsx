import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import {
    DdSdkReactNative,
    DdSdkReactNativeConfiguration,
    DdLogs
} from 'dd-sdk-reactnative';

import { CLIENT_TOKEN, ENVIRONMENT, APPLICATION_ID } from './src/ddCredentials';
import { getTrackingConsent } from './src/utils';


AppRegistry.registerRunnable(appName, async props => {
    const trackingConsent = await getTrackingConsent()

    const config = new DdSdkReactNativeConfiguration(
        CLIENT_TOKEN,
        ENVIRONMENT,
        APPLICATION_ID,
        true,
        true,
        true,
        trackingConsent
    )
    config.nativeCrashReportEnabled = true
    config.sampleRate = 100
    
    DdSdkReactNative.initialize(config).then(() => {
    
        DdLogs.info('The RN Sdk was properly initialized', {
            foo: 42,
            bar: 'xyz',
        })
    
        DdSdkReactNative.setUser({id: "1337", name: "Xavier", email: "xg@example.com", type: "premium"})
    
        DdSdkReactNative.setAttributes({campaign: "react-native-bs"})
    });
    AppRegistry.registerComponent(appName, () => App);
    AppRegistry.runApplication(appName, props);
})



