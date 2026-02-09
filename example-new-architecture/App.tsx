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
        nativeCrashReportEnabled: true
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
    const user = {
      id: 'user-123',
      favoriteFruit: 'apple',
    };

    OpenFeature.setContext({
      targetingKey: user.id,
      favoriteFruit: user.favoriteFruit,
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
});

export default AppWithProviders;
