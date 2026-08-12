import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@amazon-devices/react-navigation__native';
import {
  enableFreeze,
  enableScreens,
} from '@amazon-devices/react-native-screens';
import {createStackNavigator} from '@amazon-devices/react-navigation__stack';
import {DdRumReactNavigationTracking} from '@datadog/mobile-react-navigation';
import {
  DatadogProvider,
  DatadogProviderConfiguration,
  PropagatorType,
  TrackingConsent,
} from '@datadog/mobile-react-native-vega';

import {APPLICATION_ID, CLIENT_TOKEN, ENVIRONMENT} from './ddCredentials';
import {HomeScreen} from './screens/HomeScreen';
import {NetworkScreen} from './screens/NetworkScreen';
import {RumViewsScreen} from './screens/RumViewsScreen';
import {FeatureScenariosScreen} from './screens/FeatureScenariosScreen';
import {FeatureActionsScreen} from './screens/FeatureActionsScreen';
import {colors} from './theme';

type RootStackParamList = {
  Home: undefined;
  Network: undefined;
  RumViews: undefined;
  FeatureScenarios: undefined;
  FeatureActions: undefined;
};

type RouteName = keyof RootStackParamList;

const VIEW_NAMES: Record<RouteName, string> = {
  Home: 'Home',
  Network: 'Network Requests',
  RumViews: 'RUM Views',
  FeatureScenarios: 'Feature Scenarios',
  FeatureActions: 'Feature Actions',
};

const HOME_ROUTES: Record<string, RouteName> = {
  network: 'Network',
  rumViews: 'RumViews',
  featureScenarios: 'FeatureScenarios',
  featureActions: 'FeatureActions',
};

const Stack = createStackNavigator<RootStackParamList>();

enableScreens();
enableFreeze();

const datadogConfiguration = new DatadogProviderConfiguration(
  CLIENT_TOKEN,
  ENVIRONMENT,
  TrackingConsent.GRANTED,
  {
    rumConfiguration: {
      applicationId: APPLICATION_ID,
      trackInteractions: true,
      trackResources: true,
      trackFrustrations: true,
      trackErrors: true,
      sessionSampleRate: 100,
      telemetrySampleRate: 100,
      nativeCrashReportEnabled: true,
      firstPartyHosts: [
        {
          match: 'httpbin.org',
          propagatorTypes: [
            PropagatorType.B3MULTI,
            PropagatorType.TRACECONTEXT,
          ],
        },
      ],
    },
    logsConfiguration: {},
    traceConfiguration: {},
  },
);

const AppNavigator = () => {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  useEffect(() => {
    return () => {
      if (navigationRef.current) {
        DdRumReactNavigationTracking.stopTrackingViews(navigationRef.current);
      }
    };
  }, [navigationRef]);

  return (
    <View style={styles.background}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          DdRumReactNavigationTracking.startTrackingViews(
            navigationRef.current,
            {
              viewNamePredicate: (route) =>
                VIEW_NAMES[route.name as RouteName] ?? route.name,
            },
          );
        }}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            animationEnabled: false,
            cardStyle: styles.background,
            headerShown: false,
          }}>
          <Stack.Screen name="Home">
            {({navigation}) => (
              <HomeScreen
                onNavigate={(screen) => {
                  const route = HOME_ROUTES[screen];
                  if (route) {
                    navigation.navigate(route);
                  }
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Network">
            {({navigation}) => (
              <NetworkScreen onBack={() => navigation.goBack()} />
            )}
          </Stack.Screen>
          <Stack.Screen name="RumViews">
            {({navigation, route}) => (
              <RumViewsScreen
                trackedViewKey={route.key}
                onBack={() => navigation.goBack()}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="FeatureScenarios">
            {({navigation, route}) => (
              <FeatureScenariosScreen
                trackedViewKey={route.key}
                onBack={() => navigation.goBack()}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="FeatureActions">
            {({navigation, route}) => (
              <FeatureActionsScreen
                trackedViewKey={route.key}
                onBack={() => navigation.goBack()}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
};

export const App = () => (
  <DatadogProvider configuration={datadogConfiguration}>
    <AppNavigator />
  </DatadogProvider>
);

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
