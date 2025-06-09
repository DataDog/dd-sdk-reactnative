/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  Button,
  Platform,
  SafeAreaView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DdRum, ErrorSource, RumActionType } from '@datadog/mobile-react-native';
import { RUMEvent} from '../types';
import type { RUMManualScenarioProps } from '../types';
import { RunType } from '../../../testSetup/types/testConfig';
import { instrument, sleep } from '../../../testSetup/testUtils';
import { Colors, CommonStyles as styles } from '../../../common/styles';
import Picker from '../../../component/Picker/Picker';
import Stepper from '../../../component/Stepper/Stepper';
import { RUM_ACTION_TYPES, RUM_EVENTS } from '../constants';
import { Monitor } from '../../../testSetup/monitor';

const OS = Platform.OS
const DEFAULT_EVENTS_PER_SECOND = 5;
const DEFAULT_INTERVAL_SECONDS = 2;
const DEFAULT_VIEW_NAME = 'FooComponentView';
const DEFAULT_ACTION_URL = 'actionEventTitle';
const DEFAULT_RESOURCE_URL = 'https://api.shopist.io/checkout.json';
const DEFAULT_ERROR_MESSAGE = `RN ${OS} benchmark debug error message`;

function RUMManualScenario(props: RUMManualScenarioProps): React.JSX.Element {
    const monitor = useRef(Monitor);

    const isSending = useRef<boolean>(false);
    const [isSendingState, setIsSendingState] = useState<boolean>(isSending.current);
    const [eventsSentCount, setEventsSentCount] = useState<number>(0);

    const [eventType, setEventType] = useState<RUMEvent>(RUMEvent.View);
    const [viewName, setViewName] = useState<string>(DEFAULT_VIEW_NAME);
    const [actionType, setActionType] = useState<RumActionType>(RumActionType.TAP);
    const [actionURL, setActionURL] = useState<string>(DEFAULT_ACTION_URL);
    const [resourceURL, setResourceURL] = useState<string>(DEFAULT_RESOURCE_URL);
    const [errorMessage, setErrorMessage] = useState<string>(DEFAULT_ERROR_MESSAGE);

    const [eventsPerBatch, setEventsPerBatch] = useState<number>(DEFAULT_EVENTS_PER_SECOND);
    const [intervalSeconds, setIntervalSeconds] = useState<number>(DEFAULT_INTERVAL_SECONDS);

    const [isRepeatSendingEvents, setIsRepeatSendingEvents] = useState<boolean>(false);

    useEffect(() => {
        if (props.testConfig?.runType !== RunType.BASELINE) {
            instrument().then(() => {
                monitor.current = DdRum;
                monitor.current.startView('rumManualScenarioView', 'rumManual');
            });
        }

        return(() => {
            monitor.current.stopView('rumManualScenarioView');
        });
    }, []);

    const onEventTypeChanged = (newEventType: RUMEvent | unknown) => {
        setEventType(newEventType as RUMEvent);
    };

    const onActionTypeChanged = (newActionType: RumActionType | unknown) => {
        setActionType(newActionType as RumActionType);
    };

    const onEventsPerBatchChanged = (newEventsPerBatch: string) => {
        const newEventsPerBatchNumber = parseInt(newEventsPerBatch, 10);
        if (!Number.isNaN(newEventsPerBatchNumber)) {
            setEventsPerBatch(newEventsPerBatchNumber);
        } else {
            setEventsPerBatch(0);
        }
    };

    const onEventsPerBatchDecrease = () => {
        const newEventsPerBatch = eventsPerBatch > 1 ? eventsPerBatch - 1 : 1;
        setEventsPerBatch(newEventsPerBatch);
    };

    const onEventsPerBatchIncrease = () => {
        setEventsPerBatch(eventsPerBatch + 1);
    };

    const onIntervalSecondsChanged = (newIntervalSeconds: string) => {
        const newIntervalSecondsNumber = parseInt(newIntervalSeconds, 10);
        if (!Number.isNaN(newIntervalSecondsNumber)) {
            setIntervalSeconds(newIntervalSecondsNumber);
        } else {
            setIntervalSeconds(0);
        }
    };

    const onIntervalSecondsDecrease = () => {
        const newIntervalSeconds = intervalSeconds > 1 ? intervalSeconds - 1 : 1;
        setIntervalSeconds(newIntervalSeconds);
    };

    const onIntervalSecondsIncrease = () => {
        setIntervalSeconds(intervalSeconds + 1);
    };

    const onToggleIsRepeatSendingEvents = () => {
        setIsRepeatSendingEvents(!isRepeatSendingEvents);
    };

    const startSending = () => {
        isSending.current = true;
        setIsSendingState(true);

        if (isRepeatSendingEvents) {
            const sendInterval = setInterval(() => {
                if (!isSending.current) {
                    clearInterval(sendInterval);
                    stopSending();
                    return;
                }
                sendEvents();
            }, intervalSeconds * 1000); // in ms
        } else {
            sendEvents();
            stopSending();
        }
    };

    const stopSending = () => {
        isSending.current = false;
        setIsSendingState(false);
    };

    const sendEvents = async () => {
        for (let i=0; i<eventsPerBatch; i++) {
            switch(eventType) {
                case RUMEvent.View:
                    await sendViewEvent();
                    break;
                case RUMEvent.Action:
                    await sendActionEvent();
                    break;
                case RUMEvent.Resource:
                    await sendResourceEvent();
                    break;
                case RUMEvent.Error:
                    await sendErrorEvent();
                    break;
            };;
        };

        setEventsSentCount(prev => prev + eventsPerBatch);
    };

    const sendViewEvent = async () => {
        monitor.current.startView(viewName, viewName);
        await sleep(500);
        monitor.current.stopView(viewName);
    };

    const sendActionEvent = async () => {
        monitor.current.startView(viewName, viewName);
        await sleep(200);
        monitor.current.addAction(actionType, viewName);
        await sleep(500);
        monitor.current.stopView(viewName);
    };

    const sendResourceEvent = async () => {
        monitor.current.startView(viewName, viewName);
        const resourceKey = '/resource/1';
        monitor.current.startResource(resourceKey, 'GET', resourceURL);
        await sleep(200);
        monitor.current.stopResource(resourceKey, 200, 'image');
        monitor.current.stopView(viewName);
    };

    const sendErrorEvent = () => {
        monitor.current.startView(viewName, viewName);
        monitor.current.addError(errorMessage, ErrorSource.NETWORK, 'foo.js:45');
        monitor.current.stopView(viewName);
    };

    return (
        <SafeAreaView style={styles.safeAreaContainer}>
            <View style={styles.container}>
                <Text style={styles.title}>RUM EVENT SELECTION</Text>
                <View style={styles.holder}>
                    <View style={styles.row}>
                        <Text style={styles.label}>{'Select RUM event'}</Text>
                        <Picker 
                            label={eventType}
                            values={RUM_EVENTS}
                            onValueChange={onEventTypeChanged}/>
                    </View>
                </View>
                <Text style={styles.title}>{`${eventType.toUpperCase()} EVENT CONFIGURATION`}</Text>
                <View style={styles.holder}>
                    <View style={styles.row}>
                        <TextInput
                            placeholder='View name'
                            style={styles.input}
                            value={viewName}
                            onChangeText={setViewName}
                            />
                    </View>
                    {eventType === RUMEvent.Action && 
                        <View style={styles.row}>
                            <Text style={styles.label}>{'Action Type'}</Text>
                            <Picker 
                                label={actionType}
                                values={RUM_ACTION_TYPES}
                                onValueChange={onActionTypeChanged}/>
                        </View>
                    }
                    {eventType === RUMEvent.Action && 
                        <View style={styles.row}>
                            <TextInput
                                placeholder='Action URL'
                                style={styles.input}
                                value={actionURL}
                                onChangeText={setActionURL}
                                />
                        </View>
                    }
                    {eventType === RUMEvent.Resource && 
                        <View style={styles.row}>
                            <TextInput
                                placeholder='Resource URL'
                                style={styles.input}
                                value={resourceURL}
                                onChangeText={setResourceURL}
                                />
                        </View>
                    }
                    {eventType === RUMEvent.Error && 
                        <View style={styles.row}>
                            <TextInput
                                placeholder='error message'
                                style={styles.input}
                                value={errorMessage}
                                onChangeText={setErrorMessage}
                                />
                        </View>
                    }
                </View>
                <Text style={styles.title}>SENDING CONFIGURATION</Text>
                <View style={styles.holder}>
                    <View style={styles.row}>
                        <Text style={styles.label}>{'Events per Batch:'}</Text>
                            <TextInput
                                style={[styles.smallInput, styles.inputBorder]}
                                value={eventsPerBatch.toString()}
                                onChangeText={onEventsPerBatchChanged}
                                />
                        <Stepper
                            onDecreasePressed={onEventsPerBatchDecrease}
                            onIncreasePressed={onEventsPerBatchIncrease}
                            />
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>{'Interval (sec):'}</Text>
                            <TextInput
                                style={[styles.smallInput, styles.inputBorder]}
                                value={intervalSeconds.toString()}
                                onChangeText={onIntervalSecondsChanged}
                                />
                        <Stepper
                            onDecreasePressed={onIntervalSecondsDecrease}
                            onIncreasePressed={onIntervalSecondsIncrease}
                            />
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>{'Repeat sending events'}</Text>
                        <Switch
                            trackColor={{false: Colors.Grey, true: Colors.DatadogPurple}}
                            thumbColor={Colors.White}
                            onValueChange={onToggleIsRepeatSendingEvents}
                            value={isRepeatSendingEvents}
                            />
                    </View>
                </View>
                <View style={styles.buttonWrapper}>
                    <Button 
                        color={OS === 'android' ? Colors.DatadogPurple : Colors.White}
                        onPress={isSendingState ? stopSending : startSending}
                        title={isSendingState ? 'Stop' : 'Send'}
                    />
                </View>
            <Text style={styles.resultTitle}>{`Events sent: ${eventsSentCount}`}</Text>
            </View>
        </SafeAreaView>
    )
};

export default RUMManualScenario;