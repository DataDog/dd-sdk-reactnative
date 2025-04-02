/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {useNavigation} from '@react-navigation/native';
import {
  TextAndInputPrivacyLevel,
  View,
} from '@datadog/mobile-react-native-session-replay';
import React from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import Routes from '../Routes';
import {PrimaryButton} from '../components/common/PrimaryButton';

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  const goToShopist = () => {
    navigation.navigate(Routes.SHOPIST_LOGIN.id);
  };

  const goToPlayground = () => {
    navigation.navigate(Routes.PLAYGROUND.id);
  };

  const goToWebview = () => {
    navigation.navigate(Routes.WEBVIEW.id);
  };

  const goToBiometricsLogin = () => {
    navigation.navigate(Routes.BIOMETRICS_LOGIN.id);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainerStyle}>
      <PrimaryButton
        text="Go to Shopist"
        onPress={goToShopist}
        style={styles.scrollViewItem}
      />
      <PrimaryButton
        text="Go to Playground"
        onPress={goToPlayground}
        style={styles.scrollViewItem}
      />

      <View textAndInputPrivacy={TextAndInputPrivacyLevel.MASK_ALL}>
        <PrimaryButton
          text="Go to Webview"
          onPress={goToWebview}
          style={styles.scrollViewItem}
        />

        <PrimaryButton
          text="Go to Biometrics"
          onPress={goToBiometricsLogin}
          style={styles.scrollViewItem}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  contentContainerStyle: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    rowGap: 16,
    padding: 24,
  },
  scrollViewItem: {
    paddingVertical: 16,
  },
});
