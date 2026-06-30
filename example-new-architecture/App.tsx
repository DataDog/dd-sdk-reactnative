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
import type {
  FlagEvaluationResult,
  FlagsProviderDebugState,
  NativeFlagsConfiguration,
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
import nativeFfeRulesConfigurationWire from '../packages/core/src/flags/__fixtures__/native-ffe/rules-configuration-wire.json';

const NATIVE_FFE_STAGING_RULES_ENDPOINT =
  'https://dd.datad0g.com/api/v2/feature-flagging/config/rules-based';
const NATIVE_FFE_STAGING_CLIENT_TOKEN =
  'pub542a31cc0f5b23136420667ca212045a';
const NATIVE_FFE_STORAGE_OPTIONS = {
  slot: 'default',
};
const NATIVE_FFE_USER = {
  id: 'user-123',
  favoriteFruit: 'apple',
};
const NATIVE_FFE_BUNDLED_RULES_WIRE = JSON.stringify(
  nativeFfeRulesConfigurationWire,
);
const NATIVE_FFE_DEMO_FLAG = 'boolean-false-assignment';
const NATIVE_FFE_ANONYMOUS_CONTEXT = {
  targetingKey: 'anonymous-user',
  attributes: {
    should_disable_feature: true,
  },
};
const NATIVE_FFE_AUTHENTICATED_CONTEXT = {
  targetingKey: 'authenticated-user',
  attributes: {
    should_disable_feature: false,
  },
};
const NATIVE_FFE_STAGING_CONTEXT = {
  targetingKey: 'test_subject4',
  attributes: {
    attr1: 'value1',
    companyId: '1',
  },
};
const NATIVE_FFE_STAGING_FLAGS = {
  boolean: 'ffe-dogfooding-boolean-flag',
  string: 'ffe-dogfooding-string-flag',
  integer: 'ffe-dogfooding-integer-flag',
  float: 'ffe-dogfooding-float-flag',
  object: 'ffe-dogfooding-json-flag',
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
      summary: 'Running native FF&E flow...',
    });

    try {
      const bundledConfiguration = await DdSdkReactNative.configurationFromString(
        NATIVE_FFE_BUNDLED_RULES_WIRE,
      );
      const bundledState = await DdSdkReactNative.setConfiguration(
        bundledConfiguration,
      );
      await DdSdkReactNative.setEvaluationContext(
        NATIVE_FFE_ANONYMOUS_CONTEXT,
      );
      const anonymousResult = await DdSdkReactNative.resolveBooleanEvaluation(
        NATIVE_FFE_DEMO_FLAG,
        true,
      );
      await DdSdkReactNative.setEvaluationContext(
        NATIVE_FFE_AUTHENTICATED_CONTEXT,
      );
      const authenticatedResult = await DdSdkReactNative.resolveBooleanEvaluation(
        NATIVE_FFE_DEMO_FLAG,
        true,
      );
      const beforeFetchState = await DdSdkReactNative.getProviderDebugState();
      const fetchedConfiguration = await DdSdkReactNative.fetchRulesConfiguration({
        endpoint: NATIVE_FFE_STAGING_RULES_ENDPOINT,
        headers: {
          'Fastly-Client': '1',
          'dd-client-token': NATIVE_FFE_STAGING_CLIENT_TOKEN,
        },
        flagQueryParams: {
          dd_env: 'staging',
        },
        previousConfigurationWire: NATIVE_FFE_BUNDLED_RULES_WIRE,
      });
      const afterFetchState = await DdSdkReactNative.getProviderDebugState();
      const serializedWire = await DdSdkReactNative.configurationToString(
        fetchedConfiguration,
      );
      const fetchedParsedConfiguration = await DdSdkReactNative.configurationFromString(
        serializedWire,
      );
      const saveState = await DdSdkReactNative.saveConfiguration(
        fetchedParsedConfiguration,
        NATIVE_FFE_STORAGE_OPTIONS,
      );
      const loadedConfiguration = await DdSdkReactNative.loadConfiguration(
        NATIVE_FFE_STORAGE_OPTIONS,
      );
      const afterLoadState = await DdSdkReactNative.getProviderDebugState();
      const loadedState = await DdSdkReactNative.setConfiguration(
        loadedConfiguration,
      );
      await DdSdkReactNative.setEvaluationContext(
        NATIVE_FFE_STAGING_CONTEXT,
      );
      const stagingResults = {
        boolean: await DdSdkReactNative.resolveBooleanEvaluation(
          NATIVE_FFE_STAGING_FLAGS.boolean,
          false,
        ),
        string: await DdSdkReactNative.resolveStringEvaluation(
          NATIVE_FFE_STAGING_FLAGS.string,
          'Fallback title',
        ),
        integer: await DdSdkReactNative.resolveNumberEvaluation(
          NATIVE_FFE_STAGING_FLAGS.integer,
          0,
        ),
        float: await DdSdkReactNative.resolveNumberEvaluation(
          NATIVE_FFE_STAGING_FLAGS.float,
          0,
        ),
        object: await DdSdkReactNative.resolveObjectEvaluation(
          NATIVE_FFE_STAGING_FLAGS.object,
          {},
        ),
      };
      const debugState = await DdSdkReactNative.getProviderDebugState();

      setFlowState({
        status: 'ready',
        summary: `Offline ${anonymousResult.value} -> ${
          authenticatedResult.value
        }; fetch count ${beforeFetchState.fetchCount} -> ${
          afterFetchState.fetchCount
        }; evaluated ${Object.keys(stagingResults).length} staging flags.`,
        details: JSON.stringify(
          {
            offlineInit: {
              bundledConfiguration: summarizeConfiguration(
                bundledConfiguration,
              ),
              setState: summarizeDebugState(bundledState),
              anonymousResult: summarizeEvaluation(anonymousResult),
              authenticatedResult: summarizeEvaluation(authenticatedResult),
              fetchCountAfterContextChange: beforeFetchState.fetchCount,
            },
            nativeFetch: {
              activeBeforeFetch: summarizeDebugState(beforeFetchState),
              fetchedConfiguration: summarizeConfiguration(
                fetchedConfiguration,
              ),
              activeAfterFetch: summarizeDebugState(afterFetchState),
              activeStateUnchanged:
                beforeFetchState.activeEtag === afterFetchState.activeEtag &&
                beforeFetchState.configurationSetCount ===
                  afterFetchState.configurationSetCount,
              serializedWireBytes: serializedWire.length,
            },
            nativePersistence: {
              saveState: summarizeDebugState(saveState),
              loadedConfiguration: summarizeConfiguration(loadedConfiguration),
              stateAfterLoad: summarizeDebugState(afterLoadState),
              loadDidNotActivate:
                afterLoadState.activeEtag === afterFetchState.activeEtag &&
                afterLoadState.configurationSetCount ===
                  afterFetchState.configurationSetCount,
            },
            explicitActivation: {
              setState: summarizeDebugState(loadedState),
              stagingContext: NATIVE_FFE_STAGING_CONTEXT,
              stagingResults: {
                boolean: summarizeEvaluation(stagingResults.boolean),
                string: summarizeEvaluation(stagingResults.string),
                integer: summarizeEvaluation(stagingResults.integer),
                float: summarizeEvaluation(stagingResults.float),
                object: summarizeEvaluation(stagingResults.object),
              },
            },
            finalDebugState: summarizeDebugState(debugState),
          },
          null,
          2,
        ),
      });
    } catch (error) {
      setFlowState({
        status: 'error',
        summary:
          error instanceof Error
            ? error.message
            : 'Native FF&E flow failed.',
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
        Native FFE flow
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
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
        ]}>
        <Text style={styles.nativeFfeButtonText}>
          {loading ? 'Running...' : 'Run native flow'}
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
          ]}>
          {flowState.details}
        </Text>
      ) : null}
    </View>
  );
}

function summarizeConfiguration(configuration: NativeFlagsConfiguration) {
  return {
    kind: configuration.kind,
    version: configuration.version,
    etag: configuration.etag,
  };
}

function summarizeEvaluation(result: FlagEvaluationResult) {
  return {
    flagKey: result.flagKey,
    value: result.value,
    variant: result.variant,
    reason: result.reason,
    errorCode: result.errorCode,
    flagMetadata: result.flagMetadata,
  };
}

function summarizeDebugState(state: FlagsProviderDebugState) {
  return {
    status: state.status,
    activeConfigurationKind: state.activeConfigurationKind,
    activeEtag: state.activeEtag,
    configurationSetCount: state.configurationSetCount,
    configurationSaveCount: state.configurationSaveCount,
    configurationLoadCount: state.configurationLoadCount,
    fetchCount: state.fetchCount,
    evaluationCount: state.evaluationCount,
    lastEvent: state.lastEvent,
    lastFetchRequest: state.lastFetchRequest,
    lastStorage: state.lastStorage,
    lastError: state.lastError,
    evaluationSideEffects: state.evaluationSideEffects,
  };
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
