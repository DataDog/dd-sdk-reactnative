import React, {useState, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {DdRum} from '@datadog/mobile-react-native-vega';

interface RumViewsScreenProps {
  onBack: () => void;
}

interface ViewEntry {
  key: string;
  name: string;
  startedAt: string;
  stoppedAt?: string;
  isActive: boolean;
}

const VIEW_PRESETS = [
  {key: 'checkout', name: 'Checkout'},
  {key: 'product-detail', name: 'Product Detail'},
  {key: 'search-results', name: 'Search Results'},
  {key: 'user-profile', name: 'User Profile'},
];

interface ViewCardProps {
  preset: {key: string; name: string};
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
}

const ViewCard = ({preset, isActive, onStart, onStop}: ViewCardProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[viewCardStyles.card, isActive && viewCardStyles.cardActive]}>
      <View style={viewCardStyles.cardHeader}>
        <View
          style={[
            viewCardStyles.dot,
            isActive ? viewCardStyles.dotActive : viewCardStyles.dotInactive,
          ]}
        />
        <Text style={viewCardStyles.cardName}>{preset.name}</Text>
      </View>
      <Text style={viewCardStyles.cardKey}>{preset.key}</Text>
      <TouchableOpacity
        style={[
          viewCardStyles.button,
          isActive ? viewCardStyles.buttonStop : viewCardStyles.buttonStart,
          focused && viewCardStyles.buttonFocused,
        ]}
        onPress={isActive ? onStop : onStart}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        testID={isActive ? `stop-${preset.key}` : `start-${preset.key}`}>
        <Text
          style={[
            viewCardStyles.buttonText,
            isActive
              ? viewCardStyles.buttonTextStop
              : viewCardStyles.buttonTextStart,
          ]}>
          {isActive ? 'Stop View' : 'Start View'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

interface ActionButtonProps {
  label: string;
  color: string;
  onPress: () => void;
  testID: string;
}

const ActionButton = ({label, color, onPress, testID}: ActionButtonProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <TouchableOpacity
      style={[
        actionButtonStyles.button,
        {borderColor: color},
        focused && actionButtonStyles.buttonFocused,
      ]}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testID}>
      <Text style={[actionButtonStyles.label, {color}]}>{label}</Text>
    </TouchableOpacity>
  );
};

const actionButtonStyles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  buttonFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  label: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});

const viewCardStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardActive: {
    borderColor: '#44bb44',
    backgroundColor: 'rgba(68, 187, 68, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  dotActive: {
    backgroundColor: '#44bb44',
  },
  dotInactive: {
    backgroundColor: '#555555',
  },
  cardName: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
  },
  cardKey: {
    color: '#888888',
    fontSize: 18,
    marginBottom: 12,
    marginLeft: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonStart: {
    backgroundColor: 'rgba(255, 153, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#ff9900',
  },
  buttonStop: {
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  buttonFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttonTextStart: {
    color: '#ff9900',
  },
  buttonTextStop: {
    color: '#ff4444',
  },
});

export const RumViewsScreen = ({onBack}: RumViewsScreenProps) => {
  const [views, setViews] = useState<ViewEntry[]>([]);
  const [activeView, setActiveView] = useState<string | null>(null);

  const startView = useCallback(
    async (key: string, name: string) => {
      if (activeView) {
        await DdRum.stopView(activeView, {});
        setViews(prev =>
          prev.map(v =>
            v.key === activeView
              ? {
                  ...v,
                  isActive: false,
                  stoppedAt: new Date().toLocaleTimeString(),
                }
              : v,
          ),
        );
      }

      await DdRum.startView(key, name, {});
      setActiveView(key);
      setViews(prev => [
        {
          key,
          name,
          startedAt: new Date().toLocaleTimeString(),
          isActive: true,
        },
        ...prev.filter(v => v.key !== key || !v.isActive),
      ]);
    },
    [activeView],
  );

  const stopView = useCallback(
    async (key: string) => {
      if (activeView === key) {
        await DdRum.stopView(key, {});
        setViews(prev =>
          prev.map(v =>
            v.key === key && v.isActive
              ? {
                  ...v,
                  isActive: false,
                  stoppedAt: new Date().toLocaleTimeString(),
                }
              : v,
          ),
        );
        setActiveView(null);
      }
    },
    [activeView],
  );

  const runFullCycle = useCallback(async () => {
    for (const preset of VIEW_PRESETS) {
      await DdRum.startView(preset.key, preset.name, {
        source: 'full-cycle-test',
      });
      setViews(prev => [
        {
          key: preset.key,
          name: preset.name,
          startedAt: new Date().toLocaleTimeString(),
          isActive: true,
        },
        ...prev,
      ]);

      await new Promise(resolve => setTimeout(resolve, 500));

      await DdRum.stopView(preset.key, {});
      setViews(prev =>
        prev.map(v =>
          v.key === preset.key && v.isActive
            ? {
                ...v,
                isActive: false,
                stoppedAt: new Date().toLocaleTimeString(),
              }
            : v,
        ),
      );
    }
    setActiveView(null);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.sidebar}>
        <Text style={styles.title}>RUM Views</Text>
        {VIEW_PRESETS.map(preset => (
          <ViewCard
            key={preset.key}
            preset={preset}
            isActive={activeView === preset.key}
            onStart={() => startView(preset.key, preset.name)}
            onStop={() => stopView(preset.key)}
          />
        ))}

        <View style={styles.actions}>
          <ActionButton
            label="Run Full Cycle"
            color="#ff9900"
            onPress={runFullCycle}
            testID="runCycle"
          />
          <ActionButton
            label="Back to Home"
            color="#aaaaaa"
            onPress={onBack}
            testID="backHome"
          />
        </View>
      </ScrollView>

      <View style={styles.log}>
        <Text style={styles.logTitle}>View Log</Text>
        <ScrollView style={styles.logList}>
          {views.length === 0 ? (
            <Text style={styles.emptyText}>
              No views tracked yet. Start a view to begin.
            </Text>
          ) : (
            views.map((entry, index) => (
              <View key={`${entry.key}-${index}`} style={styles.logItem}>
                <View
                  style={[
                    styles.statusDot,
                    entry.isActive ? styles.dotActive : styles.dotStopped,
                  ]}
                />
                <View style={styles.logContent}>
                  <Text style={styles.logName}>{entry.name}</Text>
                  <Text style={styles.logTimes}>
                    Started: {entry.startedAt}
                    {entry.stoppedAt ? ` | Stopped: ${entry.stoppedAt}` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    padding: 40,
  },
  sidebar: {
    flex: 2,
    paddingRight: 40,
    paddingLeft: 60,
  },
  title: {
    color: 'white',
    fontSize: 50,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  actions: {
    marginTop: 10,
  },
  log: {
    flex: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    padding: 20,
  },
  logTitle: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logList: {
    flex: 1,
  },
  emptyText: {
    color: '#888888',
    fontSize: 22,
    fontStyle: 'italic',
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
    marginRight: 10,
  },
  dotActive: {
    backgroundColor: '#44bb44',
  },
  dotStopped: {
    backgroundColor: '#888888',
  },
  logContent: {
    flex: 1,
  },
  logName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  logTimes: {
    color: '#888888',
    fontSize: 18,
    marginTop: 2,
  },
});
