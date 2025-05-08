import { DatadogProvider, TrackingConsent } from '@datadog/mobile-react-native';
import type { ViewNamePredicate } from '@datadog/mobile-react-navigation';
import { DdRumReactNavigationTracking } from '@datadog/mobile-react-navigation';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { Route } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import * as React from 'react';

import type { RootStackParamList } from './NavigationRoot';
import { navigationRef } from './NavigationRoot';
import { getDatadogConfig, onDatadogInitialization } from './ddUtils';
import AboutScreen from './screens/AboutScreen';
import ErrorScreen from './screens/ErrorScreen';
import MainScreen from './screens/MainScreen';
import { NestedNavigator } from './screens/NestedNavigator/NestedNavigator';
import styles from './screens/styles';

const Tab = createBottomTabNavigator<RootStackParamList>();

const viewPredicate: ViewNamePredicate = function customViewNamePredicate(
    route: Route<string, any | undefined>,
    trackedName: string
) {
    return `Custom RN ${trackedName}`;
};

export default function App() {
    return (
        <DatadogProvider
            configuration={getDatadogConfig(TrackingConsent.GRANTED)}
            onInitialization={onDatadogInitialization}
        >
            <NavigationContainer
                ref={navigationRef}
                onReady={() => {
                    DdRumReactNavigationTracking.startTrackingViews(
                        navigationRef.current,
                        viewPredicate
                    );
                }}
            >
                <Tab.Navigator
                    screenOptions={{
                        tabBarLabelStyle: styles.tabLabelStyle,
                        tabBarStyle: styles.tabItemStyle,
                        tabBarIconStyle: { display: 'none' }
                    }}
                >
                    <Tab.Screen name="Home" component={MainScreen} />
                    <Tab.Screen name="Error" component={ErrorScreen} />
                    <Tab.Screen name="About" component={AboutScreen} />
                    <Tab.Screen name="Nested" component={NestedNavigator} />
                </Tab.Navigator>
            </NavigationContainer>
        </DatadogProvider>
    );
}
