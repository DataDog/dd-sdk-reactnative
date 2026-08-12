import React, {useCallback, useMemo, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  DdRum,
  DdSdkReactNative,
  ErrorSource,
  FeatureOperationFailure,
  RumActionType,
  TrackingConsent,
} from '@datadog/mobile-react-native-vega';
import {colors} from '../theme';

interface FeatureScenariosScreenProps {
  onBack: () => void;
}

type ScenarioStatus = 'ready' | 'running' | 'passed' | 'failed';
type LogStatus = 'info' | 'success' | 'error';

interface ScenarioLog {
  id: string;
  timestamp: string;
  scenario: string;
  message: string;
  status: LogStatus;
}

interface Scenario {
  id: string;
  title: string;
  detail: string;
  run: (addLog: AddLog) => Promise<void>;
}

type AddLog = (scenario: string, message: string, status?: LogStatus) => void;

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getTimestamp = () => new Date().toLocaleTimeString();

const createScenarioKey = (prefix: string) => `${prefix}-${Date.now()}`;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

interface ScenarioButtonProps {
  scenario: Scenario;
  status: ScenarioStatus;
  disabled: boolean;
  onPress: () => void;
}

const ScenarioButton = ({
  scenario,
  status,
  disabled,
  onPress,
}: ScenarioButtonProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        scenarioButtonStyles.card,
        focused && scenarioButtonStyles.cardFocused,
        disabled && scenarioButtonStyles.cardDisabled,
      ]}
      testID={`scenario-${scenario.id}`}
    >
      <View style={scenarioButtonStyles.header}>
        <Text
          style={[
            scenarioButtonStyles.title,
            focused && scenarioButtonStyles.textFocused,
          ]}
        >
          {scenario.title}
        </Text>
        <Text
          style={[
            scenarioButtonStyles.status,
            status === 'passed' && scenarioButtonStyles.statusPassed,
            status === 'failed' && scenarioButtonStyles.statusFailed,
            status === 'running' && scenarioButtonStyles.statusRunning,
            focused && scenarioButtonStyles.textFocused,
          ]}
        >
          {status.toUpperCase()}
        </Text>
      </View>
      <Text
        style={[
          scenarioButtonStyles.detail,
          focused && scenarioButtonStyles.textFocused,
        ]}
      >
        {scenario.detail}
      </Text>
    </TouchableOpacity>
  );
};

const scenarioButtonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: colors.border,
  },
  cardFocused: {
    borderColor: colors.focus,
    backgroundColor: colors.focusSurface,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  detail: {
    color: colors.textSecondary,
    fontSize: 18,
    lineHeight: 24,
  },
  status: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: 'bold',
    width: 72,
    textAlign: 'right',
  },
  statusPassed: {
    color: colors.success,
  },
  statusFailed: {
    color: colors.error,
  },
  statusRunning: {
    color: colors.warning,
  },
  textFocused: {
    color: colors.focusText,
  },
});

interface ActionButtonProps {
  label: string;
  color: string;
  disabled?: boolean;
  onPress: () => void;
  testID: string;
}

const ActionButton = ({
  label,
  color,
  disabled = false,
  onPress,
  testID,
}: ActionButtonProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      style={[
        actionButtonStyles.button,
        {borderColor: color},
        focused && actionButtonStyles.buttonFocused,
        disabled && actionButtonStyles.buttonDisabled,
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
  buttonDisabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  labelFocused: {
    color: colors.focusText,
  },
});

export const FeatureScenariosScreen = ({
  onBack,
}: FeatureScenariosScreenProps) => {
  const [logs, setLogs] = useState<ScenarioLog[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ScenarioStatus>>({});
  const [runningId, setRunningId] = useState<string | null>(null);

  const addLog = useCallback<AddLog>(
    (scenario: string, message: string, status: LogStatus = 'info') => {
      setLogs((prev) =>
        [
          {
            id: `${Date.now()}-${prev.length}`,
            timestamp: getTimestamp(),
            scenario,
            message,
            status,
          },
          ...prev,
        ].slice(0, 30),
      );
    },
    [],
  );

  const scenarios = useMemo<Scenario[]>(
    () => [
      {
        id: 'sdk-context',
        title: 'SDK Context',
        detail: 'Global attributes and tracking consent updates',
        run: async (log) => {
          await DdSdkReactNative.addAttribute('vega.scenario.mode', 'manual');
          await DdSdkReactNative.addAttributes({
            'vega.scenario.batch': true,
            'vega.scenario.timestamp': Date.now(),
          });
          await DdSdkReactNative.removeAttribute('vega.scenario.mode');
          await DdSdkReactNative.setTrackingConsent(TrackingConsent.PENDING);
          await wait(100);
          await DdSdkReactNative.setTrackingConsent(TrackingConsent.GRANTED);
          log(
            'SDK Context',
            'Updated global attributes and restored granted consent',
            'success',
          );
        },
      },
      {
        id: 'view-lifecycle',
        title: 'View Lifecycle',
        detail: 'Manual start/stop plus view attributes',
        run: async (log) => {
          const viewKey = createScenarioKey('scenario-view');
          await DdRum.startView(viewKey, 'Scenario Manual View', {
            scenario: 'view-lifecycle',
          });
          await DdRum.addViewAttribute('scenario.view.active', true);
          await DdRum.addViewAttributes({
            'scenario.view.stage': 'attributes-added',
            'scenario.view.counter': 1,
          });
          await wait(250);
          await DdRum.removeViewAttribute('scenario.view.active');
          await DdRum.removeViewAttributes([
            'scenario.view.stage',
            'scenario.view.counter',
          ]);
          await DdRum.stopView(viewKey, {
            scenario: 'view-lifecycle',
            completed: true,
          });
          await DdRum.startView('featureScenarios', 'Feature Scenarios', {
            scenario: 'view-lifecycle',
            restoredAfterTest: true,
          });
          log('View Lifecycle', `Started and stopped ${viewKey}`, 'success');
        },
      },
      {
        id: 'actions',
        title: 'RUM Actions',
        detail: 'Long custom action and one-shot tap action',
        run: async (log) => {
          await wait(150);
          await DdRum.startAction(
            RumActionType.CUSTOM,
            'Scenario Long Action',
            {
              scenario: 'actions',
            },
          );
          await wait(250);
          await DdRum.stopAction(RumActionType.CUSTOM, 'Scenario Long Action', {
            scenario: 'actions',
            completed: true,
          });
          await DdRum.addAction(RumActionType.TAP, 'Scenario Tap Action', {
            scenario: 'actions',
          });
          await wait(150);
          await DdRum.stopAction(RumActionType.TAP, 'Scenario Tap Action', {
            scenario: 'actions',
          });
          log('RUM Actions', 'Sent long and one-shot actions', 'success');
        },
      },
      {
        id: 'manual-resource',
        title: 'Manual Resource',
        detail: 'Explicit startResource and stopResource calls',
        run: async (log) => {
          const resourceKey = createScenarioKey('manual-resource');
          const url = 'https://httpbin.org/status/200';
          await DdRum.startResource(resourceKey, 'GET', url, {
            scenario: 'manual-resource',
          });
          await wait(300);
          await DdRum.stopResource(resourceKey, 200, 'fetch', 1024, {
            scenario: 'manual-resource',
            mocked: true,
          });
          log('Manual Resource', `Completed ${resourceKey}`, 'success');
        },
      },
      {
        id: 'automatic-resource',
        title: 'Automatic Resource',
        detail: 'Fetch request captured by resource tracking',
        run: async (log) => {
          const url = 'https://httpbin.org/get?dd_scenario=automatic_resource';
          const response = await fetch(url);
          const body = await response.text();
          if (!response.ok) {
            throw new Error(`HTTP ${response.status} from ${url}`);
          }
          log(
            'Automatic Resource',
            `Fetched ${response.status} response (${body.length} bytes)`,
            'success',
          );
        },
      },
      {
        id: 'rum-error',
        title: 'RUM Error',
        detail: 'Handled custom error with attributes and fingerprint',
        run: async (log) => {
          const error = new Error('Vega feature scenario handled error');
          await DdRum.addError(
            error.message,
            ErrorSource.CUSTOM,
            error.stack || 'No stack available',
            {
              scenario: 'rum-error',
              handled: true,
            },
            Date.now(),
            'vega-feature-scenario-error',
          );
          log('RUM Error', 'Sent handled custom error', 'success');
        },
      },
      {
        id: 'feature-operations',
        title: 'Feature Operations',
        detail: 'Success and failure operation outcomes',
        run: async (log) => {
          const successKey = createScenarioKey('operation-success');
          await DdRum.startFeatureOperation(
            'scenario.video.playback',
            successKey,
            {
              scenario: 'feature-operation',
              outcome: 'pending',
            },
          );
          await wait(250);
          await DdRum.succeedFeatureOperation(
            'scenario.video.playback',
            successKey,
            {
              scenario: 'feature-operation',
              outcome: 'success',
            },
          );

          const failureKey = createScenarioKey('operation-failure');
          await DdRum.startFeatureOperation(
            'scenario.settings.load',
            failureKey,
            {
              scenario: 'feature-operation',
              outcome: 'pending',
            },
          );
          await wait(150);
          await DdRum.failFeatureOperation(
            'scenario.settings.load',
            failureKey,
            FeatureOperationFailure.ERROR,
            {
              scenario: 'feature-operation',
              outcome: 'failure',
            },
          );
          log(
            'Feature Operations',
            'Sent success and failure operation outcomes',
            'success',
          );
        },
      },
      {
        id: 'session',
        title: 'RUM Session',
        detail: 'Stop the active RUM session',
        run: async (log) => {
          await DdRum.stopSession();
          log('RUM Session', 'Requested session stop', 'success');
        },
      },
    ],
    [],
  );

  const executeScenario = useCallback(
    async (scenario: Scenario) => {
      setStatuses((prev) => ({...prev, [scenario.id]: 'running'}));
      addLog(scenario.title, 'Started');

      try {
        await scenario.run(addLog);
        setStatuses((prev) => ({...prev, [scenario.id]: 'passed'}));
      } catch (error) {
        const message = getErrorMessage(error);
        addLog(scenario.title, message, 'error');
        setStatuses((prev) => ({...prev, [scenario.id]: 'failed'}));
      }
    },
    [addLog],
  );

  const runScenario = useCallback(
    async (scenario: Scenario) => {
      if (runningId) {
        return;
      }

      setRunningId(scenario.id);
      await executeScenario(scenario);
      setRunningId(null);
    },
    [executeScenario, runningId],
  );

  const runAllScenarios = useCallback(async () => {
    if (runningId) {
      return;
    }

    setRunningId('all');
    for (const scenario of scenarios) {
      await executeScenario(scenario);
    }
    setRunningId(null);
  }, [executeScenario, runningId, scenarios]);

  const clearResults = useCallback(() => {
    setLogs([]);
    setStatuses({});
  }, []);

  const isRunning = runningId !== null;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.sidebar}>
        <Text style={styles.title}>Feature Scenarios</Text>
        <Text style={styles.subtitle}>Supported Vega SDK event generation</Text>
        {scenarios.map((scenario) => (
          <ScenarioButton
            key={scenario.id}
            scenario={scenario}
            status={statuses[scenario.id] || 'ready'}
            disabled={isRunning}
            onPress={() => runScenario(scenario)}
          />
        ))}
      </ScrollView>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Scenario Log</Text>
          <Text style={styles.panelStatus}>
            {isRunning ? 'Running' : 'Ready'}
          </Text>
        </View>

        <View style={styles.actions}>
          <ActionButton
            label={isRunning ? 'Running...' : 'Run All Scenarios'}
            color={colors.focus}
            disabled={isRunning}
            onPress={runAllScenarios}
            testID="runAllScenarios"
          />
          <ActionButton
            label="Clear Results"
            color={colors.textSecondary}
            disabled={isRunning}
            onPress={clearResults}
            testID="clearScenarioResults"
          />
          <ActionButton
            label="Back to Home"
            color={colors.textMuted}
            disabled={isRunning}
            onPress={onBack}
            testID="backHome"
          />
        </View>

        <ScrollView style={styles.logList}>
          {logs.length === 0 ? (
            <Text style={styles.emptyText}>
              Run a scenario to generate SDK calls.
            </Text>
          ) : (
            logs.map((entry) => (
              <View key={entry.id} style={styles.logItem}>
                <Text
                  style={[
                    styles.logStatus,
                    entry.status === 'success' && styles.logStatusSuccess,
                    entry.status === 'error' && styles.logStatusError,
                  ]}
                >
                  {entry.status.toUpperCase()}
                </Text>
                <View style={styles.logContent}>
                  <Text style={styles.logTitle}>{entry.scenario}</Text>
                  <Text style={styles.logMessage}>{entry.message}</Text>
                </View>
                <Text style={styles.logTime}>{entry.timestamp}</Text>
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
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 24,
    marginBottom: 18,
  },
  panel: {
    flex: 3,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: 'bold',
  },
  panelStatus: {
    color: colors.warning,
    fontSize: 20,
    fontWeight: 'bold',
  },
  actions: {
    marginBottom: 12,
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
  logStatus: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: 'bold',
    width: 74,
    marginTop: 4,
  },
  logStatusSuccess: {
    color: colors.success,
  },
  logStatusError: {
    color: colors.error,
  },
  logContent: {
    flex: 1,
  },
  logTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  logMessage: {
    color: colors.textSecondary,
    fontSize: 18,
    marginTop: 2,
  },
  logTime: {
    color: colors.textMuted,
    fontSize: 18,
    marginLeft: 12,
    marginTop: 2,
  },
});
