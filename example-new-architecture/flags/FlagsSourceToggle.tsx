import React, {useState} from 'react';
import {View, Text, Switch, ActivityIndicator, StyleSheet} from 'react-native';

import {setFlagsProvider, setOfflineExampleContext} from './flagsProvider';
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
  const [included, setIncluded] = useState(true);
  const [busy, setBusy] = useState(false);

  const onToggle = async (nextOffline: boolean) => {
    setBusy(true);
    try {
      await setFlagsProvider(nextOffline ? 'offline' : 'online');
      setOffline(nextOffline);
      if (nextOffline) {
        setIncluded(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const onAudienceToggle = async (nextIncluded: boolean) => {
    setBusy(true);
    try {
      await setOfflineExampleContext(nextIncluded);
      setIncluded(nextIncluded);
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
      {offline ? (
        <>
          <Text style={styles.audienceLabel}>
            Rules match: {included ? 'yes' : 'no'}
          </Text>
          <Switch
            accessibilityLabel="offline_rules_context_toggle"
            value={included}
            onValueChange={onAudienceToggle}
            disabled={busy}
          />
        </>
      ) : null}
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
  audienceLabel: {
    marginLeft: 16,
    marginRight: 10,
  },
});
