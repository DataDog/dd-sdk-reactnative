import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MainScreen from './screens/MainScreen';
import ErrorScreen from './screens/ErrorScreen';
import AboutScreen from './screens/AboutScreen';
import style from './screens/styles';
import { navigationRef } from './NavigationRoot';
import { DdRumReactNavigationTracking, NavigationTrackingOptions, ParamsTrackingPredicate, ViewNamePredicate, ViewTrackingPredicate } from '@datadog/mobile-react-navigation';
import { DatadogProvider, TrackingConsent, DdFlags } from '@datadog/mobile-react-native'
import { DatadogOpenFeatureProvider } from '@datadog/mobile-react-native-openfeature';
import { OpenFeature, OpenFeatureProvider } from '@openfeature/react-sdk';
import { Route } from "@react-navigation/native";
import { NestedNavigator } from './screens/NestedNavigator/NestedNavigator';
import { getDatadogConfig, onDatadogInitialization } from './ddUtils';

const Tab = createBottomTabNavigator();

// === Navigation Tracking custom predicates
const viewNamePredicate: ViewNamePredicate = function customViewNamePredicate(route: Route<string, any | undefined>, trackedName: string) {
  return "Custom RN " + trackedName;
}

const viewTrackingPredicate: ViewTrackingPredicate = function customViewTrackingPredicate(route: Route<string, any | undefined>) {
  if (route.name === "AlertModal") {
    return false;
  }

  return true;
}

const paramsTrackingPredicate: ParamsTrackingPredicate = function customParamsTrackingPredicate(route: Route<string, any | undefined>) {
  const filteredParams: any = {};
  if (route.params?.creditCardNumber) {
    filteredParams["creditCardNumber"] = "XXXX XXXX XXXX XXXX";
  }

  if (route.params?.username) {
    filteredParams["username"] = route.params.username;
  }

  return filteredParams;
}

const navigationTrackingOptions: NavigationTrackingOptions = {
  viewNamePredicate,
  viewTrackingPredicate,
  paramsTrackingPredicate,
}
// === Datadog Provider Configuration schemes ===

// 1.- Direct configuration
const configuration = getDatadogConfig(TrackingConsent.GRANTED)

// 2.- File based configuration from .json
// const configuration = new FileBasedConfiguration(require("../datadog-configuration.json"));

// 3.- File based configuration from .json and custom mapper setup
// const configuration = new FileBasedConfiguration( {
//   configuration: require("../datadog-configuration.json").configuration,
//   errorEventMapper: (event) => event,
//   resourceEventMapper: (event) => event,
//   actionEventMapper: (event) => event});

// 4.- File based configuration from the native side (using initFromNative)
// see https://docs.datadoghq.com/real_user_monitoring/guide/initialize-your-native-sdk-before-react-native-starts

// const configuration = new DatadogProviderConfiguration("fake_value", "fake_value");

const handleDatadogInitialization = async () => {
  onDatadogInitialization();

  // Enable Datadog Flags feature.
  await DdFlags.enable();

  // Set the provider with OpenFeature.
  const provider = new DatadogOpenFeatureProvider();
  OpenFeature.setProvider(provider);
}

export default function App() {
  return (
    <DatadogProvider configuration={configuration} onInitialization={handleDatadogInitialization}>
      <OpenFeatureProvider>
        <NavigationContainer ref={navigationRef} onReady={() => {
          DdRumReactNavigationTracking.startTrackingViews(
            navigationRef.current,
            navigationTrackingOptions)
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
      </OpenFeatureProvider>
    </DatadogProvider>
  )
}
