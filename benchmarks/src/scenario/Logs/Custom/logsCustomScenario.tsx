/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  Button,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LogLevel, PAYLOADS_BY_SIZE, PayloadSize } from '../types';
import type {LogsCustomScenarioProps} from '../types';
import { RunType } from '../../../testSetup/types/testConfig';
import { instrument } from '../../../testSetup/testUtils';
import { Colors, CommonStyles as styles } from '../../../common/styles';
import Stepper from '../../../component/Stepper/Stepper';
import { DdLogs } from '@datadog/mobile-react-native';
import { Logger } from '../../../testSetup/logger';
import Picker from '../../../component/Picker/Picker';
import { DEFAULT_LOGS_PER_SECOND, DEFAULT_LOG_INTERVAL, DEFAULT_LOG_MESSAGE, LOG_LEVELS, MAX_LOG_OUTPUT_ENTRIES, PAYLOAD_SIZES } from '../constants';

function LogsCustomScenario(props: LogsCustomScenarioProps): React.JSX.Element {
  const logger = useRef(Logger);
  const [logMessage, setLogMessage] = useState<string>(DEFAULT_LOG_MESSAGE);
  const [logLevel, setLogLevel] = useState<LogLevel>(LogLevel.INFO);
  const [payloadSize, setPayloadSize] = useState<PayloadSize>(
    PayloadSize.Small,
  );
  const [logsPerSecond, setLogsPerSecond] = useState<number>(
    DEFAULT_LOGS_PER_SECOND,
  );
  const [logInterval, setLogInterval] = useState<number>(DEFAULT_LOG_INTERVAL);
  const [isRepeatLogging, setIsRepeatLogging] = useState<boolean>(false);
  const isLogging = useRef<boolean>(false);
  const [isLoggingState, setIsLoggingState] = useState(isLogging.current);

  const logOutputBuffer = useRef<string[]>([]);
  const [logOutput, setLogOutput] = useState<string[]>(logOutputBuffer.current);
  const logOutPutScrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (props.testConfig?.runType !== RunType.BASELINE) {
      instrument().then(() => {
        logger.current = DdLogs;
      });
    }
  }, []);

  // UI Management
  const onLogLevelChanged = (newLogLevel: LogLevel | unknown) => {
    setLogLevel(newLogLevel as LogLevel);
  };

  const onPayloadSizeChanged = (newPayloadSize: PayloadSize | unknown) => {
    setPayloadSize(newPayloadSize as PayloadSize);
  };

  const onLogsPerSecondChanged = (newLogsPerSecond: string) => {
    const newLogsPerSecondNumber = parseInt(newLogsPerSecond, 10);
    if (!Number.isNaN(newLogsPerSecondNumber)) {
      setLogsPerSecond(newLogsPerSecondNumber);
    }
  };

  const onLogsPerSecondDecrease = () => {
    const newLogsPerSecond = logsPerSecond > 1 ? logsPerSecond - 1 : 1;
    setLogsPerSecond(newLogsPerSecond);
  };

  const onLogsPerSecondIncrease = () => {
    setLogsPerSecond(logsPerSecond + 1);
  };

  const onLogIntervalChanged = (newLogInterval: string) => {
    const newLogsIntervalNumber = parseInt(newLogInterval, 10);
    if (!Number.isNaN(newLogsIntervalNumber)) {
      setLogInterval(newLogsIntervalNumber);
    }
  };

  const onLogIntervalDecrease = () => {
    const newLogInterval = logInterval > 1 ? logInterval - 1 : 1;
    setLogInterval(newLogInterval);
  };

  const onLogIntervalIncrease = () => {
    setLogInterval(logInterval + 1);
  };

  const onToggleIsRepeatLogging = () => {
    setIsRepeatLogging(!isRepeatLogging);
  };

  // Logging
  const startLogging = () => {
    isLogging.current = true;
    setIsLoggingState(true);
    clearLogOutput();

    if (isRepeatLogging) {
      const interval = setInterval(() => {
        if (!isLogging.current) {
          clearInterval(interval);
        } else {
          logBatch(logsPerSecond, logMessage, logLevel, payloadSize);
        }
      }, logInterval * 1000); // in ms
    } else {
      logBatch(logsPerSecond, logMessage, logLevel, payloadSize);
      stopLogging();
    }
  };

  const stopLogging = () => {
    isLogging.current = false;
    setIsLoggingState(false);
  };

  const clearLogOutput = () => {
    logOutputBuffer.current = [];
    setLogOutput(logOutputBuffer.current);
  }

  const logBatch = (
    amount: number,
    message: string,
    level: LogLevel,
    size: PayloadSize,
  ) => {
    for (let i = 0; i < amount; i++) {
      logOutputBuffer.current = [
        ...logOutputBuffer.current,
        `${new Date().toISOString()} - ${level} - ${size}: ${message}`,
      ];

      if (logOutputBuffer.current.length > MAX_LOG_OUTPUT_ENTRIES) {
        logOutputBuffer.current.shift();
      };

      setLogOutput(logOutputBuffer.current);

      switch (level) {
        case LogLevel.DEBUG:
          logger.current.debug(message, PAYLOADS_BY_SIZE[size]);
          break;
        case LogLevel.ERROR:
          logger.current.error(message, PAYLOADS_BY_SIZE[size]);
          break;
        case LogLevel.INFO:
          logger.current.info(message, PAYLOADS_BY_SIZE[size]);
          break;
        case LogLevel.WARN:
          logger.current.warn(message, PAYLOADS_BY_SIZE[size]);
          break;
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>LOG CONFIGURATION</Text>
        <View style={styles.holder}>
          <View style={styles.row}>
            <TextInput
              placeholderTextColor="000000"
              style={styles.input}
              value={logMessage}
              onChangeText={setLogMessage}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.label}>{'Log Level'}</Text>
            <Picker 
                label={logLevel}
                values={LOG_LEVELS}
                onValueChange={onLogLevelChanged}/>
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.label}>{'Payload size'}</Text>
            <Picker
              label={payloadSize}
              values={PAYLOAD_SIZES}
              onValueChange={onPayloadSizeChanged}
            />
          </View>
        </View>
        <Text style={styles.title}>LOGGING FREQUENCY</Text>
        <View style={styles.holder}>
          <View style={styles.row}>
            <Text style={styles.label}>{'Logs per Second:'}</Text>
            <TextInput
              style={[styles.smallInput, styles.inputBorder]}
              value={logsPerSecond.toString()}
              onChangeText={onLogsPerSecondChanged}
            />
            <Stepper
              onDecreasePressed={onLogsPerSecondDecrease}
              onIncreasePressed={onLogsPerSecondIncrease}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.label}>{'Interval (sec):'}</Text>
            <TextInput
              style={[styles.smallInput, styles.inputBorder]}
              value={logInterval.toString()}
              onChangeText={onLogIntervalChanged}
            />
            <Stepper
              onDecreasePressed={onLogIntervalDecrease}
              onIncreasePressed={onLogIntervalIncrease}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Pressable onPress={onToggleIsRepeatLogging}>
              <Text style={styles.label}>{'Repeat logging'}</Text>
            </Pressable>
            <Switch
              trackColor={{false: Colors.Grey, true: Colors.DatadogPurple}}
              thumbColor={Colors.White}
              onValueChange={onToggleIsRepeatLogging}
              value={isRepeatLogging}
            />
          </View>
        </View>
        <View style={styles.buttonWrapper}>
          <Button
            color={
              Platform.OS === 'android' ? Colors.DatadogPurple : Colors.White
            }
            onPress={isLoggingState ? stopLogging : startLogging}
            title={isLoggingState ? 'Stop logging' : ' Start logging'}
          />
        </View>

        <Text style={styles.title}>CONSOLE OUTPUT</Text>
        <ScrollView
          ref={logOutPutScrollViewRef}
          style={styles.holder}
          onContentSizeChange={() => {
            logOutPutScrollViewRef.current?.scrollToEnd({animated: true});
          }}>
          {logOutput.map((entry: string, index: number) => (
            <Text key={index} style={styles.logEntry}>
              {entry}
            </Text>
          ))}
        </ScrollView>
        <Pressable onPress={clearLogOutput}><Text style={styles.resultTitle}>Clear log</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

export default LogsCustomScenario;
