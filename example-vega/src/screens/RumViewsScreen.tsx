import React, {useState, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {DdRum} from '@datadog/mobile-react-native-vega';
import {colors} from '../theme';

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
        activeOpacity={1}
        style={[
          viewCardStyles.button,
          isActive ? viewCardStyles.buttonStop : viewCardStyles.buttonStart,
          focused && viewCardStyles.buttonFocused,
        ]}
        onPress={isActive ? onStop : onStart}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        testID={isActive ? `stop-${preset.key}` : `start-${preset.key}`}
      >
        <Text
          style={[
            viewCardStyles.buttonText,
            isActive
              ? viewCardStyles.buttonTextStop
              : viewCardStyles.buttonTextStart,
            focused && viewCardStyles.buttonTextFocused,
          ]}
        >
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
      activeOpacity={1}
      style={[
        actionButtonStyles.button,
        {borderColor: color},
        focused && actionButtonStyles.buttonFocused,
      ]}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testID}
    >
      <Text
        style={[
          actionButtonStyles.label,
          {color},
          focused && actionButtonStyles.labelFocused,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const actionButtonStyles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 3,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  buttonFocused: {
    backgroundColor: colors.focusSurface,
    borderColor: colors.focus,
  },
  label: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  labelFocused: {
    color: colors.focusText,
  },
});

const viewCardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cardActive: {
    borderColor: colors.success,
    backgroundColor: colors.successSurface,
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
    backgroundColor: colors.success,
  },
  dotInactive: {
    backgroundColor: colors.textMuted,
  },
  cardName: {
    color: colors.text,
    fontSize: 26,
    fontWeight: 'bold',
  },
  cardKey: {
    color: colors.textSecondary,
    fontSize: 18,
    marginBottom: 12,
    marginLeft: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 3,
    alignItems: 'center',
  },
  buttonStart: {
    backgroundColor: colors.focusSoft,
    borderColor: colors.focus,
  },
  buttonStop: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.error,
  },
  buttonFocused: {
    borderColor: colors.focus,
    backgroundColor: colors.focusSurface,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttonTextStart: {
    color: colors.focus,
  },
  buttonTextStop: {
    color: colors.error,
  },
  buttonTextFocused: {
    color: colors.focusText,
  },
});

export const RumViewsScreen = ({onBack}: RumViewsScreenProps) => {
  const [views, setViews] = useState<ViewEntry[]>([]);
  const [activeView, setActiveView] = useState<string | null>(null);

  const startView = useCallback(
    async (key: string, name: string) => {
      if (activeView) {
        await DdRum.stopView(activeView, {});
        setViews((prev) =>
          prev.map((v) =>
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
      setViews((prev) => [
        {
          key,
          name,
          startedAt: new Date().toLocaleTimeString(),
          isActive: true,
        },
        ...prev.filter((v) => v.key !== key || !v.isActive),
      ]);
    },
    [activeView],
  );

  const stopView = useCallback(
    async (key: string) => {
      if (activeView === key) {
        await DdRum.stopView(key, {});
        setViews((prev) =>
          prev.map((v) =>
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
      setViews((prev) => [
        {
          key: preset.key,
          name: preset.name,
          startedAt: new Date().toLocaleTimeString(),
          isActive: true,
        },
        ...prev,
      ]);

      await new Promise((resolve) => setTimeout(resolve, 500));

      await DdRum.stopView(preset.key, {});
      setViews((prev) =>
        prev.map((v) =>
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
        {VIEW_PRESETS.map((preset) => (
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
            color={colors.focus}
            onPress={runFullCycle}
            testID="runCycle"
          />
          <ActionButton
            label="Back to Home"
            color={colors.textSecondary}
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
    color: colors.text,
    fontSize: 50,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  actions: {
    marginTop: 10,
  },
  log: {
    flex: 3,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  logTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logList: {
    flex: 1,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 22,
    fontStyle: 'italic',
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
    marginRight: 10,
  },
  dotActive: {
    backgroundColor: colors.success,
  },
  dotStopped: {
    backgroundColor: colors.textMuted,
  },
  logContent: {
    flex: 1,
  },
  logName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  logTimes: {
    color: colors.textSecondary,
    fontSize: 18,
    marginTop: 2,
  },
});
