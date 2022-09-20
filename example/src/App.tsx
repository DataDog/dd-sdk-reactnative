import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MainScreen from './screens/MainScreen';
import ErrorScreen from './screens/ErrorScreen';
import AboutScreen from './screens/AboutScreen';
import style from './screens/styles';
import { navigationRef } from './NavigationRoot';
import { DdRumReactNavigationTracking, ViewNamePredicate } from '@datadog/mobile-react-navigation';
import {DatadogProvider} from '@datadog/mobile-react-native'
import { Route } from "@react-navigation/native";
import { NestedNavigator } from './screens/NestedNavigator/NestedNavigator';
import { getDatadogConfig, onDatadogInitialization } from './ddUtils';
import { TrackingConsent } from '@datadog/mobile-react-native';

const Tab = createBottomTabNavigator();

const viewPredicate: ViewNamePredicate = function customViewNamePredicate(route: Route<string, any | undefined>, trackedName: string) {
  return "Custom RN " + trackedName;
}

export default function App() {
  return (
    <DatadogProvider configuration={getDatadogConfig(TrackingConsent.GRANTED)} onInitialization={onDatadogInitialization}>
      <NavigationContainer ref={navigationRef} onReady={() => {
        DdRumReactNavigationTracking.startTrackingViews(navigationRef.current, viewPredicate)
      }}>
        <Tab.Navigator screenOptions={{
          tabBarLabelStyle: style.tabLabelStyle,
          tabBarStyle: style.tabItemStyle,
          tabBarIcon: () => null
        }}>
          <Tab.Screen name="Home" component={MainScreen} />
          <Tab.Screen name="Error" component={ErrorScreen} />
          <Tab.Screen name="About" component={AboutScreen} />
          <Tab.Screen name="Nested" component={NestedNavigator} />
        </Tab.Navigator>
      </NavigationContainer>
    </DatadogProvider>
  )
}
