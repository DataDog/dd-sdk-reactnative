import {
  CoreConfiguration,
  SdkVerbosity,
  UploadFrequency,
  BatchSize,
  DdSdkReactNative,
  DdRum,
  RumActionType,
  DdLogs,
  DdTrace,
  TrackingConsent,
  PropagatorType,
} from '@datadog/mobile-react-native';
import React from 'react';
import type {PropsWithChildren} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import * as ddCredentials from './ddCredentials.example';
import {runNativeFfeOfflineFixtureCorpus} from './nativeFfeOfflineFixtureRunner';

const APPLICATION_ID = ddCredentials.APPLICATION_ID;
const CLIENT_TOKEN = ddCredentials.CLIENT_TOKEN;
const ENVIRONMENT = ddCredentials.ENVIRONMENT;

const datadogInitialization = (async () => {
  const config = new CoreConfiguration(
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
            match: 'example.com',
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
  config.verbosity = SdkVerbosity.DEBUG;
  config.uploadFrequency = UploadFrequency.FREQUENT;
  config.batchSize = BatchSize.SMALL;

  // Initialize the Datadog SDK.
  await DdSdkReactNative.initialize(config);

  // Datadog SDK usage examples.
  await DdRum.startView('main', 'Main');
  setTimeout(async () => {
    await DdRum.addTiming('one_second');
  }, 1000);
  await DdRum.addAction(RumActionType.CUSTOM, 'custom action');

  await DdLogs.info('info log');

  const spanId = await DdTrace.startSpan('test span');
  await DdTrace.finishSpan(spanId);
})();

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}
      >
        <Header />

        <View
          style={{backgroundColor: isDarkMode ? Colors.black : Colors.white}}
        >
          <NativeFfeFlowPanel isDarkMode={isDarkMode} />

          <Section title="Step One">
            Edit <Text style={styles.highlight}>App.tsx</Text> to change this
            screen and then come back to see your edits.
          </Section>
          <Section title="See Your Changes">
            <ReloadInstructions />
          </Section>
          <Section title="Debug">
            <DebugInstructions />
          </Section>
          <Section title="Learn More">
            Read the docs to discover what to do next:
          </Section>
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type NativeFfeFlowState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  summary: string;
  details?: string;
};

function NativeFfeFlowPanel({
  isDarkMode,
}: {
  isDarkMode: boolean;
}): React.JSX.Element {
  const [flowState, setFlowState] = React.useState<NativeFfeFlowState>({
    status: 'idle',
    summary: 'Native FF&E flow has not run yet.',
  });
  const loading = flowState.status === 'loading';

  const runNativeFfeFlow = React.useCallback(async () => {
    setFlowState({
      status: 'loading',
      summary: 'Running native FF&E offline fixture corpus...',
    });

    try {
      await datadogInitialization;

      const report = await runNativeFfeOfflineFixtureCorpus();

      setFlowState({
        status: 'ready',
        summary: report.summary,
        details: JSON.stringify(report.details, null, 2),
      });
    } catch (error) {
      setFlowState({
        status: 'error',
        summary:
          error instanceof Error ? error.message : 'Native FF&E flow failed.',
      });
    }
  }, []);

  const autoRunStarted = React.useRef(false);
  React.useEffect(() => {
    if (autoRunStarted.current) {
      return;
    }
    autoRunStarted.current = true;
    void runNativeFfeFlow();
  }, [runNativeFfeFlow]);

  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}
      >
        Native FFE flow
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}
      >
        {flowState.summary}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={runNativeFfeFlow}
        style={({pressed}) => [
          styles.nativeFfeButton,
          loading && styles.nativeFfeButtonDisabled,
          pressed && !loading && styles.nativeFfeButtonPressed,
        ]}
      >
        <Text style={styles.nativeFfeButtonText}>
          {loading ? 'Running...' : 'Run offline fixture corpus'}
        </Text>
      </Pressable>
      {flowState.details ? (
        <Text
          selectable
          style={[
            styles.nativeFfeDetails,
            {
              color: isDarkMode ? Colors.light : Colors.dark,
              backgroundColor: isDarkMode ? Colors.black : '#f3f4f6',
            },
          ]}
        >
          {flowState.details}
        </Text>
      ) : null}
    </View>
  );
}

type SectionProps = PropsWithChildren<{
  title: string;
}>;

function Section({children, title}: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  nativeFfeButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    borderRadius: 6,
    marginTop: 16,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  nativeFfeButtonDisabled: {
    opacity: 0.6,
  },
  nativeFfeButtonPressed: {
    backgroundColor: '#1d4ed8',
  },
  nativeFfeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  nativeFfeDetails: {
    borderRadius: 6,
    fontFamily: 'Menlo',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 12,
    padding: 12,
  },
});

export default App;
