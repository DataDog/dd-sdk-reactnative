import {
  BatchSize,
  DdLogs,
  DdRum,
  DdSdkReactNative,
  DdSdkReactNativeConfiguration,
  DdTrace,
  RumActionType,
  SdkVerbosity,
  UploadFrequency,
} from '@datadog/mobile-react-native';
import type {PropsWithChildren} from 'react';
import React from 'react';
import {
  Button,
  Dimensions,
  FlatList,
  GestureResponderEvent,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
// @ts-ignore
import {
  ImagePrivacyLevel,
  SessionReplay,
  TextAndInputPrivacyLevel,
  TouchPrivacyLevel,
} from '@datadog/mobile-react-native-session-replay';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Polyline,
  Rect,
  Stop,
} from 'react-native-svg';
import {APPLICATION_ID, CLIENT_TOKEN, ENVIRONMENT} from './ddCredentials';
import DatadogLogo from './src/components/DatadogLogo';

console.log('Plugin_enabled: ', globalThis.__DD_RN_BABEL_PLUGIN_ENABLED__);

const {width: screenWidth} = Dimensions.get('window');

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

  await DdSdkReactNative.initialize(config);
  await SessionReplay.enable({
    replaySampleRate: 100,
    imagePrivacyLevel: ImagePrivacyLevel.MASK_NONE,
    textAndInputPrivacyLevel: TextAndInputPrivacyLevel.MASK_SENSITIVE_INPUTS,
    touchPrivacyLevel: TouchPrivacyLevel.SHOW,
  });

  await DdRum.startView('main', 'Main');
  setTimeout(async () => {
    await DdRum.addTiming('one_second');
  }, 1000);
  await DdRum.addAction(RumActionType.CUSTOM, 'LONG_TAP');
  await DdLogs.info('info log');
  const spanId = await DdTrace.startSpan('test span');
  await DdTrace.finishSpan(spanId);
})();

type SectionProps = PropsWithChildren<{
  title: string;
}>;

// TouchableNativeFeedback
// TouchableWithoutFeedback
// TouchableNativeFeedbackComponent
// TouchableWithoutFeedbackComponent
// TouchableHighlight
// TouchableNativeFeedbackBase
//

function Section({children, title}: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const onPress = (event: GestureResponderEvent) => {
    // console.log('Pressable: ', event);
    console.log('Pressable: ');
  };

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
      <Button
        onPress={() => console.log('Testing Button on Babel Plugin')}
        title={'Babel Plugin'}
      />
      <TouchableOpacity
        onPress={() => console.log('Testing TouchableOpacity on Babel Plugin')}>
        <Text>TouchableOpacity</Text>
      </TouchableOpacity>

      <TouchableHighlight
        onPress={() =>
          console.log('Testing TouchableHighlight on Babel Plugin')
        }>
        <Text>TouchableHighlight</Text>
      </TouchableHighlight>

      <TouchableNativeFeedback
        onPress={() =>
          console.log('Testing TouchableNativeFeedback on Babel Plugin')
        }>
        <Text>TouchableNativeFeedback</Text>
      </TouchableNativeFeedback>

      {/* <TouchableNativeFeedbackBase */}
      {/*   onPress={() => */}
      {/*     console.log('Testing TouchableNativeFeedbackBase on Babel Plugin') */}
      {/*   }> */}
      {/*   <Text>TouchableNativeFeedbackBase</Text> */}
      {/* </TouchableNativeFeedbackBase> */}

      {/* <TouchableNativeFeedbackComponent */}
      {/*   onPress={() => */}
      {/*     console.log( */}
      {/*       'Testing TouchableNativeFeedbackComponent on Babel Plugin', */}
      {/*     ) */}
      {/*   }> */}
      {/*   <Text>TouchableNativeFeedbackComponent</Text> */}
      {/* </TouchableNativeFeedbackComponent> */}

      {/* <TouchableWithoutFeedbackComponent */}
      {/*   onPress={() => */}
      {/*     console.log( */}
      {/*       'Testing TouchableWithoutFeedbackComponent on Babel Plugin', */}
      {/*     ) */}
      {/*   }> */}
      {/*   <Text>TouchableWithoutFeedbackComponent</Text> */}
      {/* </TouchableWithoutFeedbackComponent> */}

      <TouchableWithoutFeedback
        onPress={() =>
          console.log('Testing TouchableWithoutFeedback on Babel Plugin')
        }>
        <Text>TouchableWithoutFeedback</Text>
      </TouchableWithoutFeedback>

      <Pressable
        onPress={() =>
          console.log('Testing `onPress` Pressable on Babel Plugin')
        }
        onLongPress={() =>
          console.log('Testing `onLongPress` Pressable on Babel Plugin')
        }>
        <Text>Pressable</Text>
      </Pressable>

      <Pressable onPress={onPress}>
        <Text>Pressable with SyntheticEvent</Text>
      </Pressable>
    </View>
  );
}

const svgItems = [
  {
    key: 'gradient-circle',
    render: () => (
      <Svg height="120" width="120">
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#f00" stopOpacity="1" />
            <Stop offset="100%" stopColor="#00f" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Circle cx="60" cy="60" r="50" fill="url(#grad)" />
      </Svg>
    ),
  },
  {
    key: 'fancy-rect',
    render: () => (
      <Svg height="100" width="300">
        <Rect
          x="10"
          y="10"
          width="280"
          height="80"
          rx="20"
          fill="#4CAF50"
          stroke="#388E3C"
          strokeWidth="5"
        />
      </Svg>
    ),
  },
  {
    key: 'eye-ellipse',
    render: () => (
      <Svg height="100" width="200">
        <Ellipse cx="100" cy="50" rx="80" ry="35" fill="#03A9F4" />
      </Svg>
    ),
  },
  {
    key: 'polyline-wave',
    render: () => (
      <Svg height="100" width="300">
        <Polyline
          points="0,50 50,20 100,50 150,20 200,50 250,20 300,50"
          fill="none"
          stroke="#E91E63"
          strokeWidth="4"
        />
      </Svg>
    ),
  },
  {
    key: 'polygon-star',
    render: () => (
      <Svg height="100" width="100">
        <Polygon
          points="50,15 61,70 95,25 5,25 39,70"
          fill="#FF9800"
          stroke="#F57C00"
          strokeWidth="2"
        />
      </Svg>
    ),
  },
  {
    key: 'custom-path',
    render: () => (
      <Svg height="100" width="100">
        <Path
          d="M10 80 C 40 10, 65 10, 95 80 S 150 150, 180 80"
          stroke="#9C27B0"
          strokeWidth="3"
          fill="none"
        />
      </Svg>
    ),
  },
  {
    key: 'grouped-elements',
    render: () => (
      <Svg height="100" width="200">
        <G fill="none" stroke="black" strokeWidth="2">
          <Circle cx="50" cy="50" r="30" fill="#FFC107" />
          <Line x1="50" y1="0" x2="50" y2="100" />
          <Line x1="0" y1="50" x2="100" y2="50" />
        </G>
      </Svg>
    ),
  },
];

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

      {/* <Svg height="100" width="100" viewBox="0 0 100 100"> */}
      {/*   <Circle */}
      {/*     cx="50" */}
      {/*     cy="50" */}
      {/*     r="45" */}
      {/*     stroke="blue" */}
      {/*     strokeWidth="2.5" */}
      {/*     fill="green" */}
      {/*   /> */}
      {/*   <Rect */}
      {/*     x="15" */}
      {/*     y="15" */}
      {/*     width="70" */}
      {/*     height="70" */}
      {/*     stroke="red" */}
      {/*     strokeWidth="2" */}
      {/*     fill="yellow" */}
      {/*   /> */}
      {/* </Svg> */}

      <View style={styles.headerContainer}>
        <DatadogLogo width={100} height={100} />
        <Text style={styles.header}>SVG Showcase for Session Replay</Text>
      </View>
      <FlatList
        data={svgItems}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.listContent}
        renderItem={({item}) => (
          <View style={styles.itemContainer}>{item.render()}</View>
        )}
      />

      {/* <ScrollView */}
      {/*   contentInsetAdjustmentBehavior="automatic" */}
      {/*   style={backgroundStyle}> */}
      {/*   <Header /> */}
      {/*   <View */}
      {/*     style={{ */}
      {/*       backgroundColor: isDarkMode ? Colors.black : Colors.white, */}
      {/*     }}> */}
      {/*     <Section title="Step One"> */}
      {/*       Edit <Text style={styles.highlight}>App.tsx</Text> to change this */}
      {/*       screen and then come back to see your edits. */}
      {/*     </Section> */}
      {/*     <Section title="See Your Changes"> */}
      {/*       <ReloadInstructions /> */}
      {/*     </Section> */}
      {/*     <Section title="Debug"> */}
      {/*       <DebugInstructions /> */}
      {/*     </Section> */}
      {/*     <Section title="Learn More"> */}
      {/*       Read the docs to discover what to do next: */}
      {/*     </Section> */}
      {/*     <LearnMoreLinks /> */}
      {/*   </View> */}
      {/* </ScrollView> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  headerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    margin: 16,
    textAlign: 'center',
  },
  scrollContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
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
  image: {
    width: 100,
    height: 100,
    backgroundColor: '#eee',
  },
  listContent: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  itemContainer: {
    marginVertical: 16,
    alignItems: 'center',
    width: screenWidth,
  },
});

export default App;
