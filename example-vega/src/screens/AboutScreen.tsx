import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View, Image} from 'react-native';
import {DdRum} from '@datadog/mobile-react-native-vega';
import {Link} from '../components/Link';
import {colors} from '../theme';

interface AboutScreenProps {
  onBack: () => void;
}

export const AboutScreen = ({onBack}: AboutScreenProps) => {
  const [sessionId, setSessionId] = useState<string>('loading...');

  useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const id = await DdRum.getCurrentSessionId();
        if (id) {
          setSessionId(id);
        } else {
          // Session ID not exposed by dd-sdk-cpp public API.
          setSessionId('Active (ID not exposed by C++ SDK)');
        }
      } catch {
        setSessionId('Unable to retrieve');
      }
    };
    fetchSessionId();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image source={require('../assets/vega.png')} />
        <Text style={styles.title}>About</Text>
        <Text style={styles.text}>
          This is the Datadog SDK example app for Vega OS (Amazon Fire TV).
        </Text>
        <Text style={styles.text}>
          It demonstrates RUM view tracking, network request monitoring, and
          custom actions.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Platform</Text>
          <Text style={styles.infoValue}>Amazon Vega OS (Kepler)</Text>

          <Text style={styles.infoLabel}>SDK</Text>
          <Text style={styles.infoValue}>
            @datadog/mobile-react-native-vega
          </Text>

          <Text style={styles.infoLabel}>Session ID</Text>
          <Text style={styles.infoValue}>{sessionId}</Text>
        </View>

        <View style={styles.backButton}>
          <Link linkText={'Back to Home'} onPress={onBack} testID="backHome" />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    maxWidth: 800,
  },
  title: {
    color: colors.text,
    fontSize: 60,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 26,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 36,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 30,
    marginTop: 30,
    width: 700,
  },
  infoLabel: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
  },
  infoValue: {
    color: colors.text,
    fontSize: 22,
    marginBottom: 10,
  },
  backButton: {
    marginTop: 30,
  },
});
