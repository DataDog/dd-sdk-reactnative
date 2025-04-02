/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, {useEffect, useState} from 'react';
import {Alert, StyleSheet, TextInput, View, Text} from 'react-native';
import {
  storeCredentials,
  resetCredentials,
  retrieveCredentials,
} from '../biometrics/biometricAuth';
import {PrimaryButton} from '../components/common/PrimaryButton';
import {DdRum} from '@datadog/mobile-react-native';

export default function BiometricScreen() {
  const [username, setUsername] = useState('test');
  const [password, setPassword] = useState('1234');

  useEffect(() => {
    // Start tracking the view when it mounts
    DdRum.startView('BiometricScreen', 'BiometricScreen');

    // Optionally end the view on unmount if needed
    return () => {
      DdRum.stopView('BiometricScreen');
    };
  }, []);

  const handleSave = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }
    await storeCredentials(username, password);
    Alert.alert('Success', 'Credentials saved with biometric protection');
  };

  const handleRetrieve = async () => {
    const credentials = await retrieveCredentials();
    if (credentials) {
      Alert.alert(
        'Retrieved',
        `Username: ${credentials.username}\nPassword: ${credentials.password}`,
      );
    } else {
      Alert.alert('Error', 'No credentials found or authentication failed');
    }
  };

  const handleReset = async () => {
    await resetCredentials();
    Alert.alert('Success', 'Credentials removed');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Username:</Text>
      <TextInput
        placeholder="Enter username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />
      <Text style={styles.label}>Password:</Text>
      <TextInput
        placeholder="Enter password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <View style={styles.actionContainer}>
        <PrimaryButton text="Save Credentials" onPress={handleSave} />
        <PrimaryButton
          text="Retrieve with Biometrics"
          onPress={handleRetrieve}
        />
        <PrimaryButton
          text="Reset Credentials"
          onPress={handleReset}
          style={{backgroundColor: 'red'}}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 10,
  },
  actionContainer: {
    flexDirection: 'column',
    minHeight: '100%',
    gap: 10,
  },
  label: {
    fontSize: 16,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
});
