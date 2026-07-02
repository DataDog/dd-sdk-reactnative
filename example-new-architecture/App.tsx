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
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Settings,
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
import {runFfeJsVsNativeBenchmark} from '../packages/core/src/flags/benchmark';

const APPLICATION_ID = ddCredentials.APPLICATION_ID;
const CLIENT_TOKEN = ddCredentials.CLIENT_TOKEN;
const ENVIRONMENT = ddCredentials.ENVIRONMENT;
const FFE_BENCHMARK_AUTORUN_SETTING = 'FfeBenchmarkAutorun';
const FFE_BENCHMARK_DEVICE_KIND_SETTING = 'FfeBenchmarkDeviceKind';
const FFE_BENCHMARK_REPORT_URL_SETTING = 'FfeBenchmarkReportUrl';

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
  const benchmarkAutorun = React.useMemo(isFfeBenchmarkAutorunEnabled, []);
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
          <NativeFfeFlowPanel
            benchmarkAutorun={benchmarkAutorun}
            isDarkMode={isDarkMode}
          />
          <NativeFfeBenchmarkPanel
            benchmarkAutorun={benchmarkAutorun}
            isDarkMode={isDarkMode}
          />

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

type NativeFfeBenchmarkState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  summary: string;
  details?: string;
};

function NativeFfeBenchmarkPanel({
  benchmarkAutorun,
  isDarkMode,
}: {
  benchmarkAutorun: boolean;
  isDarkMode: boolean;
}): React.JSX.Element {
  const [benchmarkState, setBenchmarkState] =
    React.useState<NativeFfeBenchmarkState>({
      status: 'idle',
      summary: 'FF&E benchmark has not run yet.',
    });
  const loading = benchmarkState.status === 'loading';

  const runBenchmark = React.useCallback(async () => {
    setBenchmarkState({
      status: 'loading',
      summary: 'Running FF&E JS-vs-native benchmark...',
    });

    try {
      await datadogInitialization;

      const report = await runFfeJsVsNativeBenchmark({
        deviceKind: benchmarkDeviceKind(),
        rnArchitecture: 'new',
        build: __DEV__ ? 'debug' : 'release',
      });
      console.log(`FFE_BENCHMARK_RESULT ${JSON.stringify(report)}`);
      await postBenchmarkReport(report);

      setBenchmarkState({
        status: 'ready',
        summary: `FF&E benchmark ${report.parity}: ${report.iterations} evaluations.`,
        details: JSON.stringify(report, null, 2),
      });
    } catch (error) {
      setBenchmarkState({
        status: 'error',
        summary:
          error instanceof Error ? error.message : 'FF&E benchmark failed.',
      });
    }
  }, []);

  const benchmarkAutoRunStarted = React.useRef(false);
  React.useEffect(() => {
    if (benchmarkAutoRunStarted.current || !benchmarkAutorun) {
      return;
    }
    benchmarkAutoRunStarted.current = true;
    void runBenchmark();
  }, [benchmarkAutorun, runBenchmark]);

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
        FF&E benchmark
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}
      >
        {benchmarkState.summary}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={runBenchmark}
        style={({pressed}) => [
          styles.nativeFfeButton,
          loading && styles.nativeFfeButtonDisabled,
          pressed && !loading && styles.nativeFfeButtonPressed,
        ]}
      >
        <Text style={styles.nativeFfeButtonText}>
          {loading ? 'Running...' : 'Run JS vs native benchmark'}
        </Text>
      </Pressable>
      {benchmarkState.details ? (
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
          {benchmarkState.details}
        </Text>
      ) : null}
    </View>
  );
}

function isFfeBenchmarkAutorunEnabled(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }
  const value = Settings.get(FFE_BENCHMARK_AUTORUN_SETTING);
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true' ||
    String(value).toLowerCase() === 'yes'
  );
}

function benchmarkDeviceKind():
  | 'physical'
  | 'simulator'
  | 'emulator'
  | 'unknown' {
  if (Platform.OS !== 'ios') {
    return 'unknown';
  }
  const value = Settings.get(FFE_BENCHMARK_DEVICE_KIND_SETTING);
  return value === 'physical' || value === 'simulator' || value === 'emulator'
    ? value
    : 'unknown';
}

async function postBenchmarkReport(report: unknown): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }
  const reportUrl = Settings.get(FFE_BENCHMARK_REPORT_URL_SETTING);
  if (typeof reportUrl !== 'string' || reportUrl.length === 0) {
    return;
  }
  await fetch(reportUrl, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(report),
  });
}

type NativeFfeFlowState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  summary: string;
  details?: string;
};

function NativeFfeFlowPanel({
  benchmarkAutorun,
  isDarkMode,
}: {
  benchmarkAutorun: boolean;
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
    if (benchmarkAutorun) {
      return;
    }
    autoRunStarted.current = true;
    void runNativeFfeFlow();
  }, [benchmarkAutorun, runNativeFfeFlow]);

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
