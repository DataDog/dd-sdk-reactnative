import React, {useState} from 'react';
import {
  View,
  Text,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import {setFlagsProvider} from './flagsProvider';
import type {FlagsSource} from './flagsProvider';

/**
 * A runtime switch between the offline (bundled, no network) and online (CDN) flags
 * providers. Toggling re-sets the OpenFeature provider, which re-renders any `<FeatureFlag>`.
 */
export const FlagsSourceToggle = ({
  initialSource = 'offline',
}: {
  initialSource?: FlagsSource;
}) => {
  const [offline, setOffline] = useState(initialSource === 'offline');
  const [busy, setBusy] = useState(false);

  const onToggle = async (nextOffline: boolean) => {
    setBusy(true);
    try {
      await setFlagsProvider(nextOffline ? 'offline' : 'online');
      setOffline(nextOffline);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Flags source: {offline ? 'offline (bundled)' : 'online (CDN)'}
      </Text>
      <Switch
        accessibilityLabel="flags_source_toggle"
        value={offline}
        onValueChange={onToggle}
        disabled={busy}
      />
      {busy ? <ActivityIndicator style={styles.spinner} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  label: {
    marginRight: 10,
  },
  spinner: {
    marginLeft: 10,
  },
});
