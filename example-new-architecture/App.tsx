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
  DdFlags,
  PropagatorType,
} from '@datadog/mobile-react-native';
import {DatadogOpenFeatureProvider} from '@datadog/mobile-react-native-openfeature';
import {
  OpenFeature,
  OpenFeatureProvider,
  useObjectFlagDetails,
} from '@openfeature/react-sdk';
import React, {Suspense} from 'react';
import type {PropsWithChildren} from 'react';
import {
  ActivityIndicator,
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
// @ts-ignore
import {APPLICATION_ID, CLIENT_TOKEN, ENVIRONMENT} from './ddCredentials';

const NATIVE_FFE_STAGING_RULES_ENDPOINT =
  'https://dd.datad0g.com/api/v2/feature-flagging/config/rules-based';
const NATIVE_FFE_STAGING_CLIENT_TOKEN =
  'pub542a31cc0f5b23136420667ca212045a';
const NATIVE_FFE_USER = {
  id: 'user-123',
  favoriteFruit: 'apple',
};
const NATIVE_FFE_EVALUATION_CONTEXT = {
  targetingKey: NATIVE_FFE_USER.id,
  attributes: {
    favoriteFruit: NATIVE_FFE_USER.favoriteFruit,
  },
};

(async () => {
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
        firstPartyHosts: [{
          match: "example.com",
          propagatorTypes: [PropagatorType.B3MULTI, PropagatorType.TRACECONTEXT]
        }]
      },
      logsConfiguration: {},
      traceConfiguration: {}
    }
  );
  config.verbosity = SdkVerbosity.DEBUG;
  config.uploadFrequency = UploadFrequency.FREQUENT;
  config.batchSize = BatchSize.SMALL;

  // Initialize the Datadog SDK.
  await DdSdkReactNative.initialize(config);

  // Enable Datadog Flags feature.
  await DdFlags.enable();

  // Set the provider with OpenFeature.
  const provider = new DatadogOpenFeatureProvider();
  OpenFeature.setProvider(provider);

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

function AppWithProviders() {
  React.useEffect(() => {
    OpenFeature.setContext({
      targetingKey: NATIVE_FFE_USER.id,
      favoriteFruit: NATIVE_FFE_USER.favoriteFruit,
    });
  }, []);

  return (
    <Suspense
      fallback={
        <SafeAreaView style={{height: '100%', justifyContent: 'center'}}>
          <ActivityIndicator />
        </SafeAreaView>
      }>
      <OpenFeatureProvider suspendUntilReady>
        <App />
      </OpenFeatureProvider>
    </Suspense>
  );
}

function App(): React.JSX.Element {
  const greetingFlag = useObjectFlagDetails('rn-sdk-test-json-flag', {
    greeting: 'Default greeting',
  });

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
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={backgroundStyle}>
        <Header />

        <View style={{backgroundColor: isDarkMode ? Colors.black : Colors.white}}>
          <Section title={greetingFlag.value.greeting}>
            The title of this section is based on the{' '}
            <Text style={styles.highlight}>{greetingFlag.flagKey}</Text> feature
            flag.{'\n\n'}
            If it's different from "Default greeting", then it is coming from
            the feature flag evaluation.{'\n\n'}
            Evaluation reason is <Text style={styles.highlight}>{greetingFlag.reason}</Text>.{'\n\n'}Inspect <Text style={styles.highlight}>greetingFlag</Text> in{' '}
            <Text style={styles.highlight}>App.tsx</Text> for more evaluation
            details.
          </Section>

          <NativeFfeFetchPanel isDarkMode={isDarkMode} />

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

type NativeFfeFetchState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  summary: string;
  details?: string;
};

function NativeFfeFetchPanel({
  isDarkMode,
}: {
  isDarkMode: boolean;
}): React.JSX.Element {
  const [fetchState, setFetchState] = React.useState<NativeFfeFetchState>({
    status: 'idle',
    summary: 'Native fetch has not run yet.',
  });
  const loading = fetchState.status === 'loading';

  const fetchNativeRulesConfiguration = React.useCallback(async () => {
    setFetchState({
      status: 'loading',
      summary: 'Fetching staging rules configuration from native...',
    });

    try {
      const fetchedConfiguration = await DdSdkReactNative.fetchRulesConfiguration({
        endpoint: NATIVE_FFE_STAGING_RULES_ENDPOINT,
        headers: {
          'Fastly-Client': '1',
          'dd-client-token': NATIVE_FFE_STAGING_CLIENT_TOKEN,
        },
        flagQueryParams: {
          dd_env: 'staging',
        },
      });
      const serializedWire = await DdSdkReactNative.configurationToString(
        fetchedConfiguration,
      );
      const parsedConfiguration = await DdSdkReactNative.configurationFromString(
        serializedWire,
      );
      const configurationState = await DdSdkReactNative.setConfiguration(
        parsedConfiguration,
      );
      const contextState = await DdSdkReactNative.setEvaluationContext(
        NATIVE_FFE_EVALUATION_CONTEXT,
      );
      const debugState = await DdSdkReactNative.getProviderDebugState();

      setFetchState({
        status: 'ready',
        summary: `Fetched ${parsedConfiguration.kind} configuration ${
          parsedConfiguration.etag ?? 'without etag'
        }.`,
        details: JSON.stringify(
          {
            fetchedConfiguration: {
              kind: fetchedConfiguration.kind,
              version: fetchedConfiguration.version,
              etag: fetchedConfiguration.etag,
            },
            serializedWireBytes: serializedWire.length,
            configurationState,
            contextState,
            debugState,
          },
          null,
          2,
        ),
      });
    } catch (error) {
      setFetchState({
        status: 'error',
        summary:
          error instanceof Error
            ? error.message
            : 'Native staging rules fetch failed.',
      });
    }
  }, []);

  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        Native FFE fetch
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {fetchState.summary}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={fetchNativeRulesConfiguration}
        style={({pressed}) => [
          styles.nativeFfeButton,
          loading && styles.nativeFfeButtonDisabled,
          pressed && !loading && styles.nativeFfeButtonPressed,
        ]}>
        <Text style={styles.nativeFfeButtonText}>
          {loading ? 'Fetching...' : 'Fetch staging rules'}
        </Text>
      </Pressable>
      {fetchState.details ? (
        <Text
          selectable
          style={[
            styles.nativeFfeDetails,
            {
              color: isDarkMode ? Colors.light : Colors.dark,
              backgroundColor: isDarkMode ? Colors.black : '#f3f4f6',
            },
          ]}>
          {fetchState.details}
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
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
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

export default AppWithProviders;
