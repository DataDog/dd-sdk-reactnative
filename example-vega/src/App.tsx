import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, ImageBackground} from 'react-native';
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
type Screen = 'home' | 'network' | 'rumViews';

const VIEW_NAMES: Record<Screen, string> = {
  home: 'Home',
  network: 'Network Requests',
  rumViews: 'RUM Views',
};

export const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
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
    DdSdkReactNative.initialize(datadogConfig);
  }, []);

  // Track RUM views on screen changes
  useEffect(() => {
    const trackView = async () => {
      if (currentViewRef.current) {
        await DdRum.stopView(currentViewRef.current, {});
      }
      await DdRum.startView(currentScreen, VIEW_NAMES[currentScreen], {});
      currentViewRef.current = currentScreen;
    };
    trackView();
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
      default:
        return <HomeScreen onNavigate={navigate} />;
    }
  };

  return (
    <ImageBackground
      source={require('./assets/background.png')}
      style={styles.background}
    >
      {renderScreen()}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});
