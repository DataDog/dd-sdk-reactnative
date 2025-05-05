/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
  View,
  Text,
  TextInput,
  Button
} from 'react-native';
import React, { useState } from 'react';
import Stepper from '../../../component/Stepper/Stepper';
import Picker from '../../../component/Picker/Picker';
import { Colors, CommonStyles as styles } from '../../../common/styles';
import {LogLevel, PayloadSize} from '../types';
import { DEFAULT_LOGS_PER_BATCH, DEFAULT_LOG_MESSAGE, LOG_LEVELS, PAYLOAD_SIZES } from '../constants';
import { StackActions, useNavigation } from '@react-navigation/native';

function ConfigScreen(): React.JSX.Element {
    const navigation = useNavigation();
    const [logMessage, setLogMessage] = useState<string>(DEFAULT_LOG_MESSAGE);
    const [logLevel, setLogLevel] = useState<LogLevel>(LogLevel.DEBUG);
    const [payloadSize, setPayloadSize] = useState<PayloadSize>(
        PayloadSize.Small,
    );
    const [logsPerBatch, setLogsPerBatch] = useState<number>(DEFAULT_LOGS_PER_BATCH);

    // UI Management
    const onLogLevelChanged = (newLogLevel: LogLevel | unknown) => {
        setLogLevel(newLogLevel as LogLevel);
    };

    const onPayloadSizeChanged = (newPayloadSize: PayloadSize | unknown) => {
        setPayloadSize(newPayloadSize as PayloadSize);
    };

    const onLogsPerBatchChanged = (newLogsPerBatch: string) => {
        const newLogsPerBatchNumber = parseInt(newLogsPerBatch, 10);
        if (!Number.isNaN(newLogsPerBatchNumber)) {
            setLogsPerBatch(newLogsPerBatchNumber);
        }
    };

    const onLogsPerBatchDecrease = () => {
        const newLogsPerBatch = logsPerBatch  > 1 ? logsPerBatch - 1 : 1;
        setLogsPerBatch(newLogsPerBatch);
    };

    const onLogsPerBatchIncrease = () => {
        setLogsPerBatch(logsPerBatch + 1);
    };

    const applyConfig = () => {
        const popToAction = StackActions.popTo('ImageList', {logMessage, logLevel, logsPerBatch, payloadSize});
        navigation.dispatch(popToAction);
    }

    return (
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
                <Text style={styles.label}>{'Logs per image:'}</Text>
                <TextInput
                    style={[styles.smallInput, styles.inputBorder]}
                    value={logsPerBatch.toString()}
                    onChangeText={onLogsPerBatchChanged}
                />
                <Stepper
                    onDecreasePressed={onLogsPerBatchDecrease}
                    onIncreasePressed={onLogsPerBatchIncrease}
                    />
            </View>
        </View>
        <Button title={'Apply config'} color={Colors.DatadogPurple} onPress={applyConfig}/>
      </View>
    )
  }

  export default ConfigScreen;