/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
  SessionReplayPrivacy,
  TextAndInputPrivacyLevel,
  View,
} from '@datadog/mobile-react-native-session-replay';
import Slider from '@react-native-community/slider';
import React, {useState} from 'react';
import {ImageBackground, StyleSheet, Text} from 'react-native';
import Routes from '../Routes';
import {AccentButton} from '../components/common/AccentButton';
import Dropdown from '../components/common/Dropdown';
import {PrimaryButton} from '../components/common/PrimaryButton';

const datadogImage = require('../../assets/images/datadog-logo.png');

const SessionReplaySetupScreen = ({navigation}: {navigation: any}) => {
  // State variables for sample rate and privacy level
  const [sampleRate, setSampleRate] = useState(100);
  const [privacyLevel, setPrivacyLevel] = useState(SessionReplayPrivacy.ALLOW);

  // Privacy level options for dropdown
  type PrivacyOptionsType = {label: string; value: SessionReplayPrivacy}[];
  const privacyOptions: PrivacyOptionsType = [
    {label: 'Mask', value: SessionReplayPrivacy.MASK},
    {
      label: 'Mask User Input',
      value: SessionReplayPrivacy.ALLOW,
    },
    {label: 'Allow', value: SessionReplayPrivacy.ALLOW},
  ];

  // Function to handle setup and navigation
  const handleSetupAndNavigate = async () => {
    console.log('Sample Rate: ', sampleRate);
    console.log('Privacy Level: ', privacyLevel);

    // // Initialize Session Replay
    // const sessionReplayConfig = {
    //   replaySampleRate: sampleRate,
    //   defaultPrivacyLevel: privacyLevel,
    // };
    //
    // await SessionReplay.enable(sessionReplayConfig);
    //
    // await DdSdkReactNative.setAttributes({
    //   sr_default_privacy_level: sessionReplayConfig.defaultPrivacyLevel,
    //   sr_replay_sample_rate: sessionReplayConfig.replaySampleRate,
    // });

    navigateToHome();
  };

  const navigateToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{name: Routes.HOME.id}],
    });
  };

  return (
    <ImageBackground
      source={datadogImage}
      style={styles.backgroundImage}
      imageStyle={{opacity: 0.05}}>
      <View
        textAndInputPrivacy={TextAndInputPrivacyLevel.MASK_ALL}
        style={styles.container}>
        <Text style={styles.title}>Session Replay Setup</Text>

        {/* Sample Rate Slider */}
        <View style={styles.optionContainer}>
          <Text style={styles.label}>Sample Rate: {sampleRate}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            step={5}
            value={sampleRate}
            onValueChange={(value: number) => setSampleRate(value)}
            minimumTrackTintColor="#1EB1FC"
            maximumTrackTintColor="#d3d3d3"
            thumbTintColor="#1EB1FC"
          />
        </View>

        {/* Privacy Level Dropdown */}
        <View style={styles.optionContainer}>
          <Text style={styles.label}>Privacy Level:</Text>
          <Dropdown
            title="Privacy Level"
            selectedValue={privacyLevel}
            onValueChange={(value: string) =>
              setPrivacyLevel(value as SessionReplayPrivacy)
            }
            options={privacyOptions}
          />
        </View>

        {/* Setup Button */}
        <PrimaryButton
          text="Enable Session Replay"
          onPress={handleSetupAndNavigate}
          style={styles.button}
        />
        <AccentButton
          text="DO NOT ENABLE"
          onPress={navigateToHome}
          style={styles.button}
        />
      </View>
    </ImageBackground>
  );
};

// Styles for the screen
const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    rowGap: 24,
    backgroundColor: '#ffffff0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  optionContainer: {
    rowGap: 4,
  },
  label: {
    fontSize: 16,
    marginVertical: 10,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    marginTop: 32,
  },
});

export default SessionReplaySetupScreen;
