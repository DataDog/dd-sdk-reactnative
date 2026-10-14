import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MainScreen from './screens/MainScreen';
import ErrorScreen from './screens/ErrorScreen';
import AboutScreen from './screens/AboutScreen';
import TraceScreen from './screens/TraceScreen';
import style from './screens/styles';
import { navigationRef } from './NavigationRoot';
import { DdRumReactNavigationTracking, NavigationTrackingOptions, ParamsTrackingPredicate, ViewNamePredicate, ViewTrackingPredicate } from '@datadog/mobile-react-navigation';
import { DdSdkReactNative, DatadogProvider, TrackingConsent, DdLogs, DdRum, DdFlags } from '@datadog/mobile-react-native'
import { OpenFeatureProvider } from '@openfeature/react-sdk';
import {
  ImagePrivacyLevel,
  SessionReplay,
  TextAndInputPrivacyLevel,
  TouchPrivacyLevel,
} from '@datadog/mobile-react-native-session-replay';

import { Route } from "@react-navigation/native";
import { NestedNavigator } from './screens/NestedNavigator/NestedNavigator';
import { getDatadogConfig } from './ddUtils';
import { setFlagsProvider } from './flags/flagsProvider';

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
  DdLogs.info('The RN Sdk was properly initialized')
  DdSdkReactNative.setUserInfo({id: "1337", name: "Xavier", email: "xg@example.com", extraInfo: { type: "premium" } })
  DdSdkReactNative.addAttributes({campaign: "ad-network"})

  // Enable Session Replay.
  await SessionReplay.enable({
    replaySampleRate: 100,
    textAndInputPrivacyLevel: TextAndInputPrivacyLevel.MASK_SENSITIVE_INPUTS,
    imagePrivacyLevel: ImagePrivacyLevel.MASK_NONE,
    touchPrivacyLevel: TouchPrivacyLevel.SHOW,
    enableHeatmaps: true,
  });

  // Enable Datadog Flags feature.
  await DdFlags.enable();

  // Set the flags provider. This example defaults to the offline provider (a bundled
  // ConfigurationWire, no network); the "Flags source" switch on the Home screen flips to
  // the online provider (CDN) at runtime.
  await setFlagsProvider('offline');

  setTimeout(async () => {
      await DdRum.reportAppFullyDisplayed();
  }, 5000);
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
            <Tab.Screen name="Trace" component={TraceScreen} />
            <Tab.Screen name="Nested" component={NestedNavigator} />
          </Tab.Navigator>
        </NavigationContainer>
      </OpenFeatureProvider>
    </DatadogProvider>
  )
}
