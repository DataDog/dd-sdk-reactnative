import type {
    ViewNamePredicate,
    ComponentDidAppearEvent
} from '@datadog/mobile-react-native-navigation';
import {
    DdRumReactNativeNavigationTracking,
    Navigation
} from '@datadog/mobile-react-native-navigation';
import { View, Text, Button } from 'react-native';
import React from 'react';

import AboutScreen from './screens/AboutScreen';
import ErrorScreen from './screens/ErrorScreen';
import MainScreen from './screens/MainScreen';
import styles from './screens/styles';

const viewPredicate: ViewNamePredicate = (
    _event: ComponentDidAppearEvent,
    trackedName: string
) => {
    return `Custom RNN ${trackedName}`;
};

function startReactNativeNavigation() {
    DdRumReactNativeNavigationTracking.startTracking(viewPredicate);
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
    Navigation.registerComponent('About', () => AboutScreen);
}

const HomeScreen = props => {
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
                title="About"
                onPress={() => {
                    Navigation.push(props.componentId, {
                        component: { name: 'About' }
                    });
                }}
            />
        </View>
    );
};

export { startReactNativeNavigation };
