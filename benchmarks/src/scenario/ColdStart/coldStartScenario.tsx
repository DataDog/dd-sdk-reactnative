/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DatadogProvider, DdRum } from '@datadog/mobile-react-native';
import { DdRumReactNavigationTracking } from '@datadog/mobile-react-navigation';
import { RunType } from '../../testSetup/types/testConfig';
import { getDatadogProviderConfig, reportFullyDisplayed } from '../../testSetup/testUtils';
import { CommonStyles } from '../../common/styles';
import type { ColdStartScenarioProps, ColdStartStackParamList } from './types';

const ITEMS = Array.from({ length: 20 }, (_, index) => `Item ${index + 1}`);

const Stack = createNativeStackNavigator<ColdStartStackParamList>();

const getColdStartProviderConfig = () => {
  const config = getDatadogProviderConfig();
  // Use the default verbosity, as customers do in release builds
  config.verbosity = undefined;
  return config;
};

function HomeScreen(props: { onLayout: () => void }): React.JSX.Element {
  return (
    <ScrollView style={CommonStyles.safeAreaContainer} onLayout={props.onLayout}>
      {ITEMS.map(item => (
        <View key={item} style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text>{item}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

/**
 * Measures the impact of the SDK initialization on cold start.
 *
 * The app is fully displayed once the first screen is laid out and, when instrumented, once the SDK
 * has finished initializing. At that point, the time since process start is reported natively
 * for every run type, and instrumented runs also call `DdRum.reportAppFullyDisplayed()`.
 *
 * Since the measure starts at process start, a deep link arms this scenario and it runs on the
 * next launch of the app (see `armColdStart` in `testUtils`).
 */
function ColdStartScenario(props: ColdStartScenarioProps): React.JSX.Element {
  const instrumented = props.testConfig?.runType !== RunType.BASELINE;
  const navigationRef = useNavigationContainerRef();
  const [configuration] = useState(getColdStartProviderConfig);
  const [isScreenReady, setScreenReady] = useState(false);
  const [isSdkReady, setSdkReady] = useState(!instrumented);
  const hasReported = useRef(false);

  useEffect(() => {
    if (!isScreenReady || !isSdkReady || hasReported.current) {
      return;
    }
    hasReported.current = true;

    reportFullyDisplayed(props.testConfig)
      .then(durationMs => console.info(`Cold start - fully displayed in ${durationMs} ms`))
      .catch(error => console.warn('Cold start - unable to report fully displayed', error));

    if (instrumented) {
      DdRum.reportAppFullyDisplayed();
    }
  }, [isScreenReady, isSdkReady]);

  const renderApp = () => (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        if (instrumented) {
          DdRumReactNavigationTracking.startTrackingViews(navigationRef.current, {
            viewNamePredicate: (_route, trackedName) => `RN ${Platform.OS} Benchmark - Cold Start - ${trackedName}`,
          });
        }
      }}>
      <Stack.Navigator>
        <Stack.Screen name="Home">
          {() => <HomeScreen onLayout={() => setScreenReady(true)} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );

  if (instrumented) {
    return (
      <DatadogProvider configuration={configuration} onInitialization={() => setSdkReady(true)}>
        {renderApp()}
      </DatadogProvider>
    );
  }

  return renderApp();
}

export default ColdStartScenario;
