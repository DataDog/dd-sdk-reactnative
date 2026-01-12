import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import MainScreen from './screens/MainScreen';
import ErrorScreen from './screens/ErrorScreen';
import AboutScreen from './screens/AboutScreen';
import {
    DdRumReactNativeNavigationTracking,
    ViewNamePredicate,
    ComponentDidAppearEvent,
    Navigation
} from '@datadog/mobile-react-native-navigation';

import styles from './screens/styles';
import { DdFlags } from '@datadog/mobile-react-native';
import TraceScreen from './screens/TraceScreen';
import { NavigationTrackingOptions, ParamsTrackingPredicate, ViewTrackingPredicate } from '@datadog/mobile-react-native-navigation/src/rum/instrumentation/DdRumReactNativeNavigationTracking';

// === Navigation Tracking custom predicates
const viewNamePredicate: ViewNamePredicate = function customViewNamePredicate(_event: ComponentDidAppearEvent, trackedName: string) {
    return "Custom RN " + trackedName;
}

const viewTrackingPredicate: ViewTrackingPredicate = function customViewTrackingPredicate(event: ComponentDidAppearEvent) {
    if (event.name === "AlertModal") {
        return false;
    }

    return true;
}

const paramsTrackingPredicate: ParamsTrackingPredicate = function customParamsTrackingPredicate(event: ComponentDidAppearEvent) {
    const filteredParams: any = {};
    if (event.passProps?.creditCardNumber) {
        filteredParams["creditCardNumber"] = "XXXX XXXX XXXX XXXX";
    }

    if (event.passProps?.username) {
        filteredParams["username"] = event.passProps.username;
    }

    return filteredParams;
}

const navigationTrackingOptions: NavigationTrackingOptions = {
  viewNamePredicate,
  viewTrackingPredicate,
  paramsTrackingPredicate,
}

function startReactNativeNavigation() {
    DdRumReactNativeNavigationTracking.startTracking(navigationTrackingOptions);
    registerScreens();
    Navigation.events().registerAppLaunchedListener(async () => {
        Navigation.setRoot({
            root: {
                stack: {
                    children: [{ component: { name: 'Home' } }]
                }
            }
        });
    });
}

function registerScreens() {
    Navigation.registerComponent('Home', () => HomeScreen);
    Navigation.registerComponent('Main', () => MainScreen);
    Navigation.registerComponent('Error', () => ErrorScreen);
    Navigation.registerComponent('Trace', () => TraceScreen);
    Navigation.registerComponent('About', () => AboutScreen);
}

const HomeScreen = props => {
    const [testFlagValue, setTestFlagValue] = useState(false);
    useEffect(() => {
        (async () => {
            await DdFlags.enable();

            const flagsClient = DdFlags.getClient();
            await flagsClient.setEvaluationContext({
                targetingKey: 'test-user-1',
                attributes: {
                    country: 'US',
                },
            });
            const flag = await flagsClient.getBooleanDetails('rn-sdk-test-boolean-flag', false); // https://app.datadoghq.com/feature-flags/046d0e70-626d-41e1-8314-3f009fb79b7a?environmentId=d114cd9a-79ed-4c56-bcf3-bcac9293653b
            setTestFlagValue(flag.value);
        })();
    }, []);

    return (
        <View style={styles.defaultScreen}>
            <Text style={{ marginBottom: 20 }}>
                Hello React Native Navigation 👋
            </Text>
            <Button
                title="Main"
                onPress={() => {
                    Navigation.push(props.componentId, {
                        component: { name: 'Main' }
                    });
                }}
            />
            <View style={{ marginTop: 20 }} />
            <Button
                title="Error"
                onPress={() => {
                    Navigation.push(props.componentId, {
                        component: { name: 'Error' }
                    });
                }}
            />
            <View style={{ marginTop: 20 }} />
            <Button
                title="Trace"
                onPress={() => {
                    Navigation.push(props.componentId, {
                        component: { name: 'Trace' }
                    });
                }}
            />
            <View style={{ marginTop: 20 }} />
            <Button
                title="About"
                onPress={() => {
                    Navigation.push(props.componentId, {
                        component: { name: 'About',
                                    passProps: {
                                        username: "test",
                                        creditCardNumber: "4242 4242 4242 4242"
                                    }
                                }
                    });
                }}
            />
            <Text style={{ marginTop: 20 }}>rn-sdk-test-boolean-flag: {String(testFlagValue)}</Text>
        </View>
    );
};

export { startReactNativeNavigation };
