import React, {useCallback, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  DdLogs,
  DdRum,
  DdSdkReactNative,
  ErrorSource,
  FeatureOperationFailure,
  RumActionType,
  TrackingConsent,
} from '@datadog/mobile-react-native-vega';
import {VegaSampleCrash} from '@example-vega/native-crash-module';
import {colors} from '../theme';

interface FeatureActionsScreenProps {
  trackedViewKey: string;
  onBack: () => void;
}

type LogStatus = 'success' | 'error' | 'info';

interface ActionLog {
  id: string;
  time: string;
  label: string;
  message: string;
  status: LogStatus;
}

interface FeatureAction {
  label: string;
  testID: string;
  run: () => Promise<string>;
}

interface ActionGroup {
  title: string;
  actions: FeatureAction[];
}

const getTime = () => new Date().toLocaleTimeString();

const makeKey = (prefix: string) => `${prefix}-${Date.now()}`;

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

interface ActionButtonProps {
  action: FeatureAction;
  disabled: boolean;
  onPress: () => void;
}

const ActionButton = ({action, disabled, onPress}: ActionButtonProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      style={[
        actionButtonStyles.button,
        focused && actionButtonStyles.buttonFocused,
        disabled && actionButtonStyles.buttonDisabled,
      ]}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={action.testID}
    >
      <Text
        style={[
          actionButtonStyles.label,
          focused && actionButtonStyles.labelFocused,
        ]}
      >
        {action.label}
      </Text>
    </TouchableOpacity>
  );
};

const actionButtonStyles = StyleSheet.create({
  button: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  buttonFocused: {
    borderColor: colors.focus,
    backgroundColor: colors.focusSurface,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  label: {
    color: colors.text,
    fontSize: 21,
    fontWeight: 'bold',
  },
  labelFocused: {
    color: colors.focusText,
  },
});

interface UtilityButtonProps {
  label: string;
  color: string;
  disabled?: boolean;
  testID: string;
  onPress: () => void;
}

const UtilityButton = ({
  label,
  color,
  disabled = false,
  testID,
  onPress,
}: UtilityButtonProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      style={[
        utilityButtonStyles.button,
        {borderColor: color},
        focused && utilityButtonStyles.buttonFocused,
        disabled && utilityButtonStyles.buttonDisabled,
      ]}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testID}
    >
      <Text
        style={[
          utilityButtonStyles.label,
          {color},
          focused && utilityButtonStyles.labelFocused,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const utilityButtonStyles = StyleSheet.create({
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

export const FeatureActionsScreen = ({
  trackedViewKey,
  onBack,
}: FeatureActionsScreenProps) => {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [activeViewKey, setActiveViewKey] = useState<string | null>(null);
  const [activeActionName, setActiveActionName] = useState<string | null>(null);
  const [activeResourceKey, setActiveResourceKey] = useState<string | null>(
    null,
  );
  const [activeSuccessOperationKey, setActiveSuccessOperationKey] = useState<
    string | null
  >(null);
  const [activeFailureOperationKey, setActiveFailureOperationKey] = useState<
    string | null
  >(null);

  const appendLog = useCallback(
    (label: string, message: string, status: LogStatus) => {
      setLogs((prev) =>
        [
          {
            id: `${Date.now()}-${prev.length}`,
            time: getTime(),
            label,
            message,
            status,
          },
          ...prev,
        ].slice(0, 40),
      );
    },
    [],
  );

  const runAction = useCallback(
    async (action: FeatureAction) => {
      if (runningAction) {
        return;
      }

      setRunningAction(action.testID);
      appendLog(action.label, 'Started', 'info');
      try {
        const message = await action.run();
        appendLog(action.label, message, 'success');
      } catch (error) {
        appendLog(action.label, getErrorMessage(error), 'error');
      } finally {
        setRunningAction(null);
      }
    },
    [appendLog, runningAction],
  );

  const groups: ActionGroup[] = [
    {
      title: 'SDK Context',
      actions: [
        {
          label: 'Add Global Attribute',
          testID: 'action-add-global-attribute',
          run: async () => {
            await DdSdkReactNative.addAttribute('vega.action.single', 'added');
            return 'Added vega.action.single';
          },
        },
        {
          label: 'Remove Global Attribute',
          testID: 'action-remove-global-attribute',
          run: async () => {
            await DdSdkReactNative.removeAttribute('vega.action.single');
            return 'Removed vega.action.single';
          },
        },
        {
          label: 'Add Global Attributes',
          testID: 'action-add-global-attributes',
          run: async () => {
            await DdSdkReactNative.addAttributes({
              'vega.action.batch': true,
              'vega.action.counter': Date.now(),
            });
            return 'Added batch global attributes';
          },
        },
        {
          label: 'Remove Global Attributes',
          testID: 'action-remove-global-attributes',
          run: async () => {
            await DdSdkReactNative.removeAttributes([
              'vega.action.batch',
              'vega.action.counter',
            ]);
            return 'Removed batch global attributes';
          },
        },
        {
          label: 'Set User Info',
          testID: 'action-set-user-info',
          run: async () => {
            await DdSdkReactNative.setUserInfo({
              id: 'vega-test-user',
              name: 'Vega Test User',
              email: 'vega-test-user@example.com',
              extraInfo: {
                plan: 'preview',
                platform: 'vega',
              },
            });
            await DdRum.addAction(RumActionType.CUSTOM, 'User Info Set', {
              source: 'feature-actions',
            });
            await DdLogs.info('Vega user info set', {
              source: 'feature-actions',
            });
            return 'Set user and emitted context test events';
          },
        },
        {
          label: 'Add User Extra Info',
          testID: 'action-add-user-extra-info',
          run: async () => {
            await DdSdkReactNative.addUserExtraInfo({
              role: 'tester',
              updatedAt: Date.now(),
            });
            await DdRum.addAction(
              RumActionType.CUSTOM,
              'User Extra Info Added',
              {source: 'feature-actions'},
            );
            await DdLogs.info('Vega user extra info added', {
              source: 'feature-actions',
            });
            return 'Merged user extra info and emitted test events';
          },
        },
        {
          label: 'Clear User Info',
          testID: 'action-clear-user-info',
          run: async () => {
            await DdSdkReactNative.clearUserInfo();
            await DdRum.addAction(RumActionType.CUSTOM, 'User Info Cleared', {
              source: 'feature-actions',
            });
            await DdLogs.info('Vega user info cleared', {
              source: 'feature-actions',
            });
            return 'Cleared user and emitted context test events';
          },
        },
        {
          label: 'Set Account Info',
          testID: 'action-set-account-info',
          run: async () => {
            await DdSdkReactNative.setAccountInfo({
              id: 'vega-test-account',
              name: 'Vega Test Account',
              extraInfo: {
                tier: 'preview',
                region: 'test',
              },
            });
            await DdRum.addAction(RumActionType.CUSTOM, 'Account Info Set', {
              source: 'feature-actions',
            });
            await DdLogs.info('Vega account info set', {
              source: 'feature-actions',
            });
            return 'Set account and emitted context test events';
          },
        },
        {
          label: 'Add Account Extra Info',
          testID: 'action-add-account-extra-info',
          run: async () => {
            await DdSdkReactNative.addAccountExtraInfo({
              subscription: 'evaluation',
              updatedAt: Date.now(),
            });
            await DdRum.addAction(
              RumActionType.CUSTOM,
              'Account Extra Info Added',
              {source: 'feature-actions'},
            );
            await DdLogs.info('Vega account extra info added', {
              source: 'feature-actions',
            });
            return 'Merged account extra info and emitted test events';
          },
        },
        {
          label: 'Clear Account Info',
          testID: 'action-clear-account-info',
          run: async () => {
            await DdSdkReactNative.clearAccountInfo();
            await DdRum.addAction(
              RumActionType.CUSTOM,
              'Account Info Cleared',
              {source: 'feature-actions'},
            );
            await DdLogs.info('Vega account info cleared', {
              source: 'feature-actions',
            });
            return 'Cleared account and emitted context test events';
          },
        },
        {
          label: 'Set Consent Pending',
          testID: 'action-consent-pending',
          run: async () => {
            await DdSdkReactNative.setTrackingConsent(TrackingConsent.PENDING);
            return 'Tracking consent set to pending';
          },
        },
        {
          label: 'Set Consent Granted',
          testID: 'action-consent-granted',
          run: async () => {
            await DdSdkReactNative.setTrackingConsent(TrackingConsent.GRANTED);
            return 'Tracking consent set to granted';
          },
        },
        {
          label: 'Clear All Data',
          testID: 'action-clear-all-data',
          run: async () => {
            await DdSdkReactNative.clearAllData();
            return 'Requested best-effort data clear';
          },
        },
      ],
    },
    {
      title: 'RUM Views',
      actions: [
        {
          label: 'Start View',
          testID: 'action-start-view',
          run: async () => {
            const key = makeKey('user-view');
            await DdRum.startView(key, 'User Triggered View', {
              source: 'feature-actions',
            });
            setActiveViewKey(key);
            return `Started ${key}`;
          },
        },
        {
          label: 'Stop View',
          testID: 'action-stop-view',
          run: async () => {
            const key = activeViewKey || makeKey('user-view');
            await DdRum.stopView(key, {
              source: 'feature-actions',
              activeViewKnown: Boolean(activeViewKey),
            });
            await DdRum.startView(trackedViewKey, 'Feature Actions', {
              source: 'feature-actions',
              restoredAfterTest: true,
            });
            setActiveViewKey(null);
            return `Stopped ${key} and restored Feature Actions`;
          },
        },
        {
          label: 'Add View Attribute',
          testID: 'action-add-view-attribute',
          run: async () => {
            await DdRum.addViewAttribute('vega.view.single', 'added');
            await DdRum.addAction(
              RumActionType.CUSTOM,
              'View Single Attribute Added',
              {source: 'feature-actions'},
            );
            return 'Added vega.view.single';
          },
        },
        {
          label: 'Remove View Attribute',
          testID: 'action-remove-view-attribute',
          run: async () => {
            await DdRum.removeViewAttribute('vega.view.single');
            return 'Removed vega.view.single';
          },
        },
        {
          label: 'Add View Attributes',
          testID: 'action-add-view-attributes',
          run: async () => {
            await DdRum.addViewAttributes({
              'vega.view.batch': true,
              'vega.view.time': Date.now(),
            });
            await DdRum.addAction(
              RumActionType.CUSTOM,
              'View Multiple Attributes Added',
              {source: 'feature-actions'},
            );
            return 'Added batch view attributes';
          },
        },
        {
          label: 'Remove View Attributes',
          testID: 'action-remove-view-attributes',
          run: async () => {
            await DdRum.removeViewAttributes([
              'vega.view.batch',
              'vega.view.time',
            ]);
            return 'Removed batch view attributes';
          },
        },
        {
          label: 'Stop Session',
          testID: 'action-stop-session',
          run: async () => {
            await DdRum.stopSession();
            await DdRum.startView(trackedViewKey, 'Feature Actions', {
              source: 'feature-actions',
              restoredAfterSessionStop: true,
            });
            return 'Stopped the session and restored Feature Actions';
          },
        },
      ],
    },
    {
      title: 'RUM Actions',
      actions: [
        {
          label: 'Start Action',
          testID: 'action-start-action',
          run: async () => {
            await wait(150);
            const name = makeKey('User Triggered Action');
            await DdRum.startAction(RumActionType.CUSTOM, name, {
              source: 'feature-actions',
            });
            setActiveActionName(name);
            return `Started ${name}`;
          },
        },
        {
          label: 'Stop Action',
          testID: 'action-stop-action',
          run: async () => {
            const name = activeActionName || 'User Triggered Action';
            await DdRum.stopAction(RumActionType.CUSTOM, name, {
              source: 'feature-actions',
              activeActionKnown: Boolean(activeActionName),
            });
            setActiveActionName(null);
            return `Stopped ${name}`;
          },
        },
        {
          label: 'Add Action',
          testID: 'action-add-action',
          run: async () => {
            await wait(150);
            await DdRum.addAction(RumActionType.TAP, 'User Triggered Tap', {
              source: 'feature-actions',
            });
            await wait(150);
            await DdRum.stopAction(RumActionType.TAP, 'User Triggered Tap', {
              source: 'feature-actions',
            });
            return 'Sent one-shot tap action';
          },
        },
        {
          label: 'Add Custom Action',
          testID: 'action-add-custom-action',
          run: async () => {
            await DdRum.addAction(
              RumActionType.CUSTOM,
              'User Triggered Custom Action',
              {source: 'feature-actions'},
            );
            return 'Sent one-shot custom action';
          },
        },
      ],
    },
    {
      title: 'RUM Resources',
      actions: [
        {
          label: 'Start Manual Resource',
          testID: 'action-start-resource',
          run: async () => {
            const key = makeKey('user-resource');
            await DdRum.startResource(
              key,
              'GET',
              'https://httpbin.org/status/200',
              {
                source: 'feature-actions',
              },
            );
            setActiveResourceKey(key);
            return `Started ${key}`;
          },
        },
        {
          label: 'Stop Manual Resource',
          testID: 'action-stop-resource',
          run: async () => {
            const key = activeResourceKey || makeKey('user-resource');
            await DdRum.stopResource(key, 200, 'fetch', 512, {
              source: 'feature-actions',
              activeResourceKnown: Boolean(activeResourceKey),
            });
            setActiveResourceKey(null);
            return `Stopped ${key}`;
          },
        },
        {
          label: 'Fetch Automatic Resource',
          testID: 'action-fetch-resource',
          run: async () => {
            const response = await fetch(
              'https://httpbin.org/get?dd_action=fetch_resource',
            );
            await response.text();
            return `Fetched resource with HTTP ${response.status}`;
          },
        },
      ],
    },
    {
      title: 'Logs',
      actions: [
        {
          label: 'Send Debug Log',
          testID: 'action-log-debug',
          run: async () => {
            await DdLogs.debug('User triggered Vega debug log', {
              source: 'feature-actions',
              levelTested: 'debug',
              timestamp: Date.now(),
            });
            return 'Sent a debug log';
          },
        },
        {
          label: 'Send Info Log',
          testID: 'action-log-info',
          run: async () => {
            await DdLogs.info('User triggered Vega info log', {
              source: 'feature-actions',
              levelTested: 'info',
              timestamp: Date.now(),
            });
            return 'Sent an info log';
          },
        },
        {
          label: 'Send Warning Log',
          testID: 'action-log-warn',
          run: async () => {
            await DdLogs.warn('User triggered Vega warning log', {
              source: 'feature-actions',
              levelTested: 'warn',
              timestamp: Date.now(),
            });
            return 'Sent a warning log';
          },
        },
        {
          label: 'Send Error Log',
          testID: 'action-log-error',
          run: async () => {
            const error = new Error('User triggered Vega error log details');
            await DdLogs.error(
              'User triggered Vega error log',
              'VegaSampleError',
              error.message,
              error.stack || 'No stack available',
              {
                source: 'feature-actions',
                levelTested: 'error',
                timestamp: Date.now(),
              },
              'vega-user-triggered-log-error',
              ErrorSource.CUSTOM,
            );
            return 'Sent an error log with error details';
          },
        },
      ],
    },
    {
      title: 'RUM Errors',
      actions: [
        {
          label: 'Automatic JS Error',
          testID: 'action-automatic-js-error',
          run: async () => {
            // eslint-disable-next-line no-console
            console.error(
              new Error('User triggered automatic Vega JavaScript error'),
            );
            return 'Sent automatically tracked JavaScript error';
          },
        },
        {
          label: 'Crash JavaScript',
          testID: 'action-crash-javascript',
          run: async () => {
            setTimeout(() => {
              throw new Error('User triggered Vega JavaScript crash');
            }, 0);
            return 'Triggering an uncaught JavaScript exception';
          },
        },
        {
          label: 'Crash App TurboModule',
          testID: 'action-crash-app-turbomodule',
          run: async () => {
            await VegaSampleCrash.crashForTesting();
            return 'App TurboModule crash requested';
          },
        },
        {
          label: 'Add Error',
          testID: 'action-add-error',
          run: async () => {
            const error = new Error('User triggered Vega test error');
            await DdRum.addError(
              error.message,
              ErrorSource.CUSTOM,
              error.stack || 'No stack available',
              {
                source: 'feature-actions',
                handled: true,
              },
              Date.now(),
              'vega-user-triggered-error',
            );
            return 'Sent handled custom error';
          },
        },
      ],
    },
    {
      title: 'Feature Operations',
      actions: [
        {
          label: 'Start Success Operation',
          testID: 'action-start-success-operation',
          run: async () => {
            const key = makeKey('success-operation');
            await DdRum.startFeatureOperation(
              'user.triggered.success.operation',
              key,
              {
                source: 'feature-actions',
                expectedOutcome: 'success',
              },
            );
            setActiveSuccessOperationKey(key);
            return `Started ${key}`;
          },
        },
        {
          label: 'Succeed Operation',
          testID: 'action-succeed-operation',
          run: async () => {
            const key =
              activeSuccessOperationKey || makeKey('success-operation');
            await DdRum.succeedFeatureOperation(
              'user.triggered.success.operation',
              key,
              {
                source: 'feature-actions',
                activeOperationKnown: Boolean(activeSuccessOperationKey),
              },
            );
            setActiveSuccessOperationKey(null);
            return `Succeeded ${key}`;
          },
        },
        {
          label: 'Start Failure Operation',
          testID: 'action-start-failure-operation',
          run: async () => {
            const key = makeKey('failure-operation');
            await DdRum.startFeatureOperation(
              'user.triggered.failure.operation',
              key,
              {
                source: 'feature-actions',
                expectedOutcome: 'failure',
              },
            );
            setActiveFailureOperationKey(key);
            return `Started ${key}`;
          },
        },
        {
          label: 'Fail Operation',
          testID: 'action-fail-operation',
          run: async () => {
            const key =
              activeFailureOperationKey || makeKey('failure-operation');
            await DdRum.failFeatureOperation(
              'user.triggered.failure.operation',
              key,
              FeatureOperationFailure.ERROR,
              {
                source: 'feature-actions',
                activeOperationKnown: Boolean(activeFailureOperationKey),
              },
            );
            setActiveFailureOperationKey(null);
            return `Failed ${key}`;
          },
        },
      ],
    },
  ];

  const runQuickSmoke = useCallback(async () => {
    if (runningAction) {
      return;
    }

    setRunningAction('quick-smoke');
    appendLog('Quick Smoke', 'Started', 'info');
    try {
      await DdSdkReactNative.addAttribute('vega.smoke', true);
      await DdLogs.info('Vega quick smoke log', {
        source: 'feature-actions',
        scenario: 'quick-smoke',
      });
      await wait(150);
      await DdRum.addAction(RumActionType.TAP, 'Quick Smoke Tap', {});
      const resourceKey = makeKey('quick-smoke-resource');
      await DdRum.startResource(
        resourceKey,
        'GET',
        'https://httpbin.org/status/200',
        {},
      );
      await wait(150);
      await DdRum.stopResource(resourceKey, 200, 'fetch', 128, {});
      appendLog(
        'Quick Smoke',
        'Sent attribute, log, action, and resource',
        'success',
      );
    } catch (error) {
      appendLog('Quick Smoke', getErrorMessage(error), 'error');
    } finally {
      setRunningAction(null);
    }
  }, [appendLog, runningAction]);

  const clearLog = useCallback(() => {
    setLogs([]);
  }, []);

  const isRunning = runningAction !== null;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.actionsColumn}>
        <Text style={styles.title}>Feature Actions</Text>
        {groups.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.actions.map((action) => (
              <ActionButton
                key={action.testID}
                action={action}
                disabled={isRunning}
                onPress={() => runAction(action)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={styles.logPanel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Action Log</Text>
          <Text style={styles.panelStatus}>
            {isRunning ? 'Running' : 'Ready'}
          </Text>
        </View>

        <View style={styles.utilityActions}>
          <UtilityButton
            label={isRunning ? 'Running...' : 'Quick Smoke'}
            color={colors.focus}
            disabled={isRunning}
            testID="action-quick-smoke"
            onPress={runQuickSmoke}
          />
          <UtilityButton
            label="Clear Log"
            color={colors.textSecondary}
            disabled={isRunning}
            testID="clearActionLog"
            onPress={clearLog}
          />
          <UtilityButton
            label="Back to Home"
            color={colors.textMuted}
            disabled={isRunning}
            testID="backHome"
            onPress={onBack}
          />
        </View>

        <ScrollView style={styles.logList}>
          {logs.length === 0 ? (
            <Text style={styles.emptyText}>
              Select any action to send one supported SDK call.
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
                  <Text style={styles.logTitle}>{entry.label}</Text>
                  <Text style={styles.logMessage}>{entry.message}</Text>
                </View>
                <Text style={styles.logTime}>{entry.time}</Text>
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
  actionsColumn: {
    flex: 2,
    paddingRight: 40,
    paddingLeft: 60,
  },
  title: {
    color: colors.text,
    fontSize: 50,
    fontWeight: 'bold',
    marginBottom: 18,
  },
  group: {
    marginBottom: 18,
  },
  groupTitle: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logPanel: {
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
  utilityActions: {
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
