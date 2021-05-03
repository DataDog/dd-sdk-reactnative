import { AppRegistry } from 'react-native';
import App from './src/App';
import { startReactNativeNavigation } from './src/WixApp';
import { name as appName } from './app.json';
import { navigation as navigationLib } from './app.json';
import { initializeDatadog } from './src/ddUtils';
import { getTrackingConsent } from './src/utils';
import { TrackingConsent } from 'dd-sdk-reactnative';


console.log("Starting Application with navigation library: " + navigationLib);
if (navigationLib == "react-navigation") {
    AppRegistry.registerRunnable(appName, async props => {

        const trackingConsent = await getTrackingConsent()
        initializeDatadog(trackingConsent);
        AppRegistry.registerComponent(appName, () => App);
        AppRegistry.runApplication(appName, props);
    })
} else if (navigationLib == "react-native-navigation") {
    initializeDatadog(TrackingConsent.GRANTED);
    startReactNativeNavigation();
}

