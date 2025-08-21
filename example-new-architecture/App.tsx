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
} from '@datadog/mobile-react-native';
import React, {useState} from 'react';
import type {PropsWithChildren} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableHighlight,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import {PaperProvider, TextInput, Button, Divider} from 'react-native-paper';

import {
  blockJavascriptThread,
  blockNativeMainThread,
} from 'react-native-performance-limiter';

import {Colors} from 'react-native/Libraries/NewAppScreen';
// @ts-ignore
import {APPLICATION_ID, CLIENT_TOKEN, ENVIRONMENT} from './ddCredentials';
import {runOnJS} from 'react-native-reanimated';
import {Tab, TabView, Button as ButtonRNUI} from '@rneui/themed';
import i18n from 'i18next';
import {initReactI18next, useTranslation} from 'react-i18next';
import {getLocales} from 'react-native-localize';

(async () => {
  const config = new DdSdkReactNativeConfiguration(
    CLIENT_TOKEN,
    ENVIRONMENT,
    APPLICATION_ID,
    true,
    true,
    true,
  );

  config.actionNameAttribute = 'testID';
  config.sessionSamplingRate = 100;
  config.verbosity = SdkVerbosity.DEBUG;
  config.telemetrySampleRate = 100;
  config.uploadFrequency = UploadFrequency.FREQUENT;
  config.batchSize = BatchSize.SMALL;
  config.longTaskThresholdMs;
  await DdSdkReactNative.initialize(config);
  await DdRum.startView('main', 'Main');
  setTimeout(async () => {
    await DdRum.addTiming('one_second');
  }, 1000);
  await DdRum.addAction(RumActionType.CUSTOM, 'custom action');
  await DdLogs.info('info log');
  const spanId = await DdTrace.startSpan('test span');
  await DdTrace.finishSpan(spanId);
})();

type SectionProps = PropsWithChildren<{
  title: string;
}>;

type Props = {
  title: string;
  singleHandler: () => void;
  multiHandler: () => void;
};

// Translations
const resources = {
  en: {translation: {hello: 'Hello', bye: 'Good Bye'}},
  pt: {translation: {hello: 'Olá', bye: 'Adeus'}},
};

// Detect user language
const language = getLocales()[0].languageCode;

i18n.use(initReactI18next).init({
  resources,
  lng: 'pt',
  fallbackLng: 'en',
  interpolation: {escapeValue: false},
});

// 1) START: compound component (parent owned state)

function TabsControlled({
  children,
  value,
  onChange,
}: {
  children: React.ReactNode;
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <View style={{flexDirection: 'row', gap: 8}}>
      {React.Children.map(children, (child, i) =>
        React.isValidElement(child)
          ? React.cloneElement(child, {
              isActive: i === value,
              onSelect: () => onChange(i),
            } as any)
          : child,
      )}
    </View>
  );
}

function TabChild({
  isActive,
  onSelect,
  children,
}: {
  isActive?: boolean;
  onSelect?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: isActive ? '#333' : '#eee',
      }}>
      <Text style={{color: isActive ? '#fff' : '#333'}}>{children}</Text>
    </Pressable>
  );
}

// 1) END: compound component (parent owned state)

function GestureButton2({singleHandler, multiHandler}: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={() => {}}>
      <Text style={styles.buttonText}>{this.props.title || 'Click Me'}</Text>
    </TouchableOpacity>
  );
}

function GestureButton({title, singleHandler, multiHandler}: Props) {
  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onStart(() => runOnJS(singleHandler)());

  const doubleTap = Gesture.Tap()
    .maxDuration(250)
    .numberOfTaps(2)
    .onStart(() => runOnJS(multiHandler)());

  return (
    <GestureDetector gesture={Gesture.Exclusive(doubleTap, singleTap)}>
      <View style={[styles.box, {backgroundColor: '#3949ab'}]}>
        <Text style={styles.touchableHighlightText}>{title}</Text>
      </View>
    </GestureDetector>
  );
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [index, setIndex] = useState(0);
  const [index2, setIndex2] = React.useState(0);
  const [btState, setBtState] = useState(false);
  const {t} = useTranslation();

  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onStart(() => {
      console.log('Single tap!');
    });

  const doubleTap = Gesture.Tap()
    .maxDuration(250)
    .numberOfTaps(2)
    .onStart(() => {
      console.log('Double tap!');
    });

  const jsLongTask = () => {
    blockJavascriptThread(1000);
  };

  const nativeLongTask = () => {
    blockNativeMainThread(1000);
  };

  const simulateAppFreeze = () => {
    blockNativeMainThread(6000);
  };

  // const namebt = btState ? 'Hello' : 'Good Bye';
  const namebt = btState ? t('hello') : t('bye');

  return (
    <GestureHandlerRootView style={styles.flex1}>
      <PaperProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={backgroundStyle.backgroundColor}
        />
        <SafeAreaView style={[styles.safeArea, backgroundStyle]}>
          <ScrollView>
            <View style={styles.sectionWrapper}>
              <>
                <View style={styles.rowBetween}>
                  <GestureDetector
                    gesture={Gesture.Exclusive(doubleTap, singleTap)}>
                    <View style={styles.box}>
                      <Text style={styles.touchableHighlightText}>
                        Gesture 1
                      </Text>
                    </View>
                  </GestureDetector>
                  <GestureButton
                    title="Gesture 2"
                    singleHandler={() => console.log('single TAP')}
                    multiHandler={() => console.log('multi TAP')}
                  />

                  <TouchableOpacity
                    style={[styles.box, {backgroundColor: 'teal'}]}
                    onPress={() => {}}>
                    <Text>
                      {'Click Me'}
                      <Text>{'2'}</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
              <Divider />
              <TextInput
                dd-action-name="Name Input"
                label="Name"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                label="Address"
                value={address}
                onChangeText={setAddress}
              />
              <Divider />
              <Button
                accessibilityLabel="JS_long_task"
                mode="contained"
                onPress={jsLongTask}>
                JS Long Task
              </Button>
              <Divider />
              <ButtonRNUI
                custom-title="custom title - native long task"
                // dd-action-name="Native Long Task"
                onPress={nativeLongTask}>
                <Text>Native Long Task</Text>
              </ButtonRNUI>
              <Divider />
              <TouchableOpacity
                style={styles.touchableOpacity}
                onPress={simulateAppFreeze}>
                <Text>App Hang</Text>
              </TouchableOpacity>
              <TouchableHighlight
                style={styles.touchableHighlight}
                onPress={() => console.log('Pressed')}>
                <Text style={styles.touchableHighlightText}>
                  Touchable Highlight
                </Text>
              </TouchableHighlight>

              <TouchableOpacity
                style={[styles.box, {backgroundColor: 'teal'}]}
                onPress={() => setBtState(prev => !prev)}>
                <Text>{namebt}</Text>
              </TouchableOpacity>
            </View>
            <View>
              <TabsControlled value={index2} onChange={setIndex2}>
                <TabChild>
                  <Text>Home</Text>
                </TabChild>
                <TabChild>
                  <Text>Profile</Text>
                </TabChild>
                <TabChild>
                  <Text>Settings</Text>
                </TabChild>
              </TabsControlled>
              );
            </View>
            <View>
              <Tab
                value={index}
                // onChange={e => {
                //   console.log('onChange: ', e);
                //   setIndex(e);
                // }}
                onChange={setIndex}
                indicatorStyle={styles.tabIndicator}
                variant="primary">
                <Tab.Item
                  title="Recent"
                  titleStyle={styles.tabTitle}
                  accessibilityLabel="Recent"
                />
                <Tab.Item
                  title="favorite"
                  titleStyle={styles.tabTitle}
                  accessibilityLabel="Favorite"
                />
                <Tab.Item
                  title="cart"
                  titleStyle={styles.tabTitle}
                  accessibilityLabel="Cart"
                />
              </Tab>

              <TabView value={index} onChange={setIndex} animationType="spring">
                <TabView.Item
                  style={[styles.tabView, {backgroundColor: 'red'}]}>
                  <Text>Recent</Text>
                </TabView.Item>
                <TabView.Item
                  style={[styles.tabView, {backgroundColor: 'blue'}]}>
                  <Text>Favorite</Text>
                </TabView.Item>
                <TabView.Item
                  style={[styles.tabView, {backgroundColor: 'green'}]}>
                  <Text>Cart</Text>
                </TabView.Item>
              </TabView>
            </View>
          </ScrollView>
        </SafeAreaView>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: 10,
    gap: 5,
    justifyContent: 'space-between',
  },
  sectionWrapper: {
    margin: 10,
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  box: {
    height: 120,
    width: 120,
    backgroundColor: '#b58df1',
    borderRadius: 20,
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchableOpacity: {
    backgroundColor: 'teal',
    padding: 10,
    alignItems: 'center',
    borderRadius: 4,
  },
  touchableHighlight: {
    backgroundColor: 'indigo',
    padding: 10,
    alignItems: 'center',
    borderRadius: 4,
  },
  touchableHighlightText: {
    color: 'white',
  },
  tabTitle: {
    fontSize: 12,
  },
  tabIndicator: {
    backgroundColor: 'white',
    height: 3,
  },
  tabView: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
