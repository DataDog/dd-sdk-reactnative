/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Example app for React Native's Swift Package Manager integration.
 *
 * It initializes the SDK, Session Replay and WebView tracking, sends a few events, and then reads
 * back what the native SDK recorded through the internal testing tools. The results are shown on
 * screen and logged with the `DD_SPM_TEST` prefix.
 */

import {
  CoreConfiguration,
  DdLogs,
  DdRum,
  DdSdkReactNative,
  DdTrace,
  RumActionType,
  SdkVerbosity,
  TrackingConsent,
} from '@datadog/mobile-react-native';
import {
  SessionReplay,
  SessionReplayView,
} from '@datadog/mobile-react-native-session-replay';
import { WebView } from '@datadog/mobile-react-native-webview';
import { InternalTesting } from '@datadog/react-native-internal-testing-tools';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
// @ts-ignore
import { APPLICATION_ID, CLIENT_TOKEN, ENVIRONMENT } from './ddCredentials';

const FEATURES = ['rum', 'logging', 'tracing', 'session-replay'] as const;

const runChecks = async (report: (line: string) => void) => {
  // Must be enabled before the SDK is initialized.
  await InternalTesting.enable();

  const config = new CoreConfiguration(
    CLIENT_TOKEN,
    ENVIRONMENT,
    TrackingConsent.GRANTED,
    {
      rumConfiguration: {
        applicationId: APPLICATION_ID,
        sessionSampleRate: 100,
        nativeCrashReportEnabled: true,
      },
      logsConfiguration: {},
      traceConfiguration: {},
    },
  );
  config.verbosity = SdkVerbosity.DEBUG;
  await DdSdkReactNative.initialize(config);
  report('SDK initialized');

  await SessionReplay.enable({ replaySampleRate: 100 });
  report('Session Replay enabled');

  await DdRum.startView('main', 'Main');
  await DdRum.addAction(RumActionType.CUSTOM, 'custom action');
  await DdLogs.info('info log');
  const spanId = await DdTrace.startSpan('test span');
  await DdTrace.finishSpan(spanId);

  // Give the native SDK time to write the events.
  await new Promise(resolve => setTimeout(resolve, 8000));
  for (const feature of FEATURES) {
    const events = await InternalTesting.getAllEvents(feature);
    report(`${feature}: ${events.length} event(s)`);
  }
  report('Done');
};

function App() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const report = (line: string) => {
      console.log('DD_SPM_TEST', line);
      setLines(previous => [...previous, line]);
    };
    runChecks(report).catch(error => report(`Failed: ${String(error)}`));
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView>
        <SessionReplayView.MaskAll>
          <Text style={styles.title}>Datadog SDK, SwiftPM example</Text>
        </SessionReplayView.MaskAll>
        {lines.map(line => (
          <Text key={line} style={styles.line}>
            {line}
          </Text>
        ))}
        <WebView
          style={styles.webview}
          allowedHosts={['example.com']}
          source={{ html: '<h1>Datadog WebView tracking</h1>' }}
          onLoadEnd={() => console.log('DD_SPM_TEST', 'WebView loaded')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '600', padding: 16 },
  line: { fontSize: 16, paddingHorizontal: 16, paddingVertical: 4 },
  webview: { height: 200, marginTop: 16 },
});

export default App;
