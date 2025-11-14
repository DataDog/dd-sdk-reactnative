import {
  DdSdkReactNativeConfiguration,
  SdkVerbosity,
  UploadFrequency,
  BatchSize,
  DdSdkReactNative,
  DdRum,
  RumActionType,
  DdLogs,
  DdTrace,
  DatadogFlags,
} from '@datadog/mobile-react-native';
import React from 'react';
import type {PropsWithChildren} from 'react';
import {
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
  const config = new DdSdkReactNativeConfiguration(
    CLIENT_TOKEN,
    ENVIRONMENT,
    APPLICATION_ID,
    true,
    true,
    true,
  );
  config.sessionSamplingRate = 100;
  config.verbosity = SdkVerbosity.DEBUG;
  config.telemetrySampleRate = 100;
  config.uploadFrequency = UploadFrequency.FREQUENT;
  config.batchSize = BatchSize.SMALL;
  config.flagsConfiguration = {
    enabled: true,
  };
  await DdSdkReactNative.initialize(config);
  await DdRum.startView('main', 'Main');
  setTimeout(async () => {
    await DdRum.addTiming('one_second');
  }, 1000);
  await DdRum.addAction(RumActionType.CUSTOM, 'custom action');
  await DdLogs.info('info log');
  const spanId = await DdTrace.startSpan('test span');
  await DdTrace.finishSpan(spanId);

  const flagsClient = DatadogFlags.getClient();

  await flagsClient.setEvaluationContext({
    targetingKey: 'test-user-1',
    attributes: {
      country: 'US',
    },
  });

})();

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

function App(): React.JSX.Element {
  const [flagValues, setFlagValues] = React.useState<Record<string, unknown>>({});

  React.useEffect(() => {
    (async () => {
      const flagsClient = DatadogFlags.getClient();

      const [booleanValue, stringValue, jsonValue, integerValue, numberValue] = await Promise.all([
        flagsClient.getBooleanDetails('rn-sdk-test-boolean-flag', false), // https://app.datadoghq.com/feature-flags/046d0e70-626d-41e1-8314-3f009fb79b7a?environmentId=d114cd9a-79ed-4c56-bcf3-bcac9293653b
        flagsClient.getStringDetails('rn-sdk-test-string-flag', 'default-value'), // https://app.datadoghq.com/feature-flags/80756d8f-a375-437a-a023-b490c91cd506?environmentId=d114cd9a-79ed-4c56-bcf3-bcac9293653b
        flagsClient.getObjectDetails('rn-sdk-test-json-flag', {default: 'value'}), // https://app.datadoghq.com/feature-flags/bcf75cd6-96d8-4182-8871-0b66ad76127a?environmentId=d114cd9a-79ed-4c56-bcf3-bcac9293653b
        flagsClient.getNumberDetails('rn-sdk-test-integer-flag', 0), // https://app.datadoghq.com/feature-flags/5cd5a154-65ef-4c15-b539-e68c93eaa7f1?environmentId=d114cd9a-79ed-4c56-bcf3-bcac9293653b
        flagsClient.getNumberDetails('rn-sdk-test-number-flag', 0.7), // https://app.datadoghq.com/feature-flags/62b3129a-f9fa-49c0-b8a2-1a772b183bf7?environmentId=d114cd9a-79ed-4c56-bcf3-bcac9293653b
      ]);

      const newValues = {
        boolean: booleanValue,
        json: jsonValue,
        integer: integerValue,
        string: stringValue,
        number: numberValue,
      };

      console.log({newValues});

      setFlagValues(newValues);
    })().catch(console.error);
  }, []);


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
        style={backgroundStyle}>
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <View>
            <Text style={{ fontFamily: 'monospace' }}>{JSON.stringify(flagValues, (key, value) => value === undefined ? '<undefined>' : value, 2)}</Text>
          </View>
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

export default App;
