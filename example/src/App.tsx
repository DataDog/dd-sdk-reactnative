import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MainScreen from './screens/MainScreen';
import AboutScreen from './screens/AboutScreen';
import style from './screens/styles';
import { navigationRef } from './NavigationRoot';
import { DdRumReactNavigationTracking, ViewNamePredicate } from '@datadog/mobile-react-navigation';
import { Route } from "@react-navigation/native";

const Tab = createBottomTabNavigator();

const viewPredicate: ViewNamePredicate = function customViewNamePredicate(route: Route<string, any | undefined>, trackedName: string) {
  return "Custom RN " + trackedName;
}

export default function App() {
  return (
    <NavigationContainer ref={navigationRef} onReady={() => {
      DdRumReactNavigationTracking.startTrackingViews(navigationRef.current, viewPredicate)
    }}>
      <Tab.Navigator tabBarOptions={{
        labelStyle: style.tabLabelStyle,
        tabStyle: style.tabItemStyle
      }}>
        <Tab.Screen name="Home" component={MainScreen} />
        <Tab.Screen name="About" component={AboutScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  )
}
