import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {
  DdSdkReactNative,
  DdRum,
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

type Screen =
  | 'home'
  | 'network'
  | 'rumViews'
  | 'featureScenarios'
  | 'featureActions';

const VIEW_NAMES: Record<Screen, string> = {
  home: 'Home',
  network: 'Network Requests',
  rumViews: 'RUM Views',
  featureScenarios: 'Feature Scenarios',
  featureActions: 'Feature Actions',
};

export const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const datadogInitializationRef = useRef<Promise<void> | null>(null);
  const currentViewRef = useRef<Screen | null>(null);

  useEffect(() => {
    const datadogConfig = new DatadogProviderConfiguration(
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
    datadogInitializationRef.current = DdSdkReactNative.initialize(
      datadogConfig,
    );
  }, []);

  // Track RUM views on screen changes
  useEffect(() => {
    const initialization = datadogInitializationRef.current;
    if (!initialization) {
      return;
    }

    let isCancelled = false;
    const trackView = async () => {
      await initialization;
      if (isCancelled) {
        return;
      }

      if (currentViewRef.current) {
        await DdRum.stopView(currentViewRef.current, {});
        if (isCancelled) {
          return;
        }
      }
      await DdRum.startView(currentScreen, VIEW_NAMES[currentScreen], {});
      currentViewRef.current = currentScreen;
    };
    trackView();

    return () => {
      isCancelled = true;
    };
  }, [currentScreen]);

  const navigate = useCallback((screen: string) => {
    setCurrentScreen(screen as Screen);
  }, []);

  const goHome = useCallback(() => {
    setCurrentScreen('home');
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'network':
        return <NetworkScreen onBack={goHome} />;
      case 'rumViews':
        return <RumViewsScreen onBack={goHome} />;
      case 'featureScenarios':
        return <FeatureScenariosScreen onBack={goHome} />;
      case 'featureActions':
        return <FeatureActionsScreen onBack={goHome} />;
      default:
        return <HomeScreen onNavigate={navigate} />;
    }
  };

  return <View style={styles.background}>{renderScreen()}</View>;
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
