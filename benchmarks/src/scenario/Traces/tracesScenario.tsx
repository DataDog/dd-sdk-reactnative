/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Button,
    Platform,
    SafeAreaView,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { DdLogs, DdTrace } from '@datadog/mobile-react-native';
import type { TracesScenarioProps } from './types';
import { RunType } from '../../testSetup/types/testConfig';
import { instrument } from '../../testSetup/testUtils';
import Stepper from '../../component/Stepper/Stepper';
import { Colors, CommonStyles as styles } from '../../common/styles';
import { Tracer } from '../../testSetup/tracer';
import { Logger } from '../../testSetup/logger';


const DEFAULT_CHILDREN_COUNT = 0;
const DEFAULT_DEPTH = 1;
const DEFAULT_CHILD_DELAY_MS = 100;
const OS = Platform.OS

function TracesScenario(props: TracesScenarioProps): React.JSX.Element {
    const tracer = useRef(Tracer);
    const logger = useRef(Logger);

    const [isSending, setIsSending] = useState<boolean>(false);
    const [tracesSentCount, setTracesSentCount] = useState<number>(0);

    const [spanOperation, setSpanOperation] = useState<string>(`RN ${OS} benchmark span operation`);
    const [spanResource, setSpanResource] = useState<string>(`RN ${OS} benchmark span resource`);
    const [isError, setIsError] = useState<boolean>(false);

    const [childrenCount, setChildrenCount] = useState<number>(DEFAULT_CHILDREN_COUNT)
    const [depth, setDepth] = useState<number>(DEFAULT_DEPTH);
    const [childDelay, setChildDelay] = useState<number>(DEFAULT_CHILD_DELAY_MS);

    useEffect(() => {
        if (props.testConfig?.runType !== RunType.BASELINE) {
            instrument();
            tracer.current = DdTrace;
            logger.current = DdLogs;
        }
    }, []);

    const sendTraces = async () => {
        setIsSending(true);
        setTracesSentCount(0);

        let rootSpan = await tracer.current.startSpan(spanOperation)

        if (isError) {
            const fields = {
                event: 'error',
                errorKind: 'simulatedError',
                message: 'Describe what happened',
                stack: 'foo.bar:64'
            }
            logger.current.error(fields.errorKind, fields);
        }

        await sleep(childDelay);

        await sendSpanTree(rootSpan, 0, depth);

        await sleep(500);
        tracer.current.finishSpan(rootSpan, {});

        setTracesSentCount(tracesSentCount + 1);                
        setIsSending(false);
    };

    const sendSpanTree = async (parent: string, currentLevel: number, maxDepth: number) => {
        if (currentLevel >= maxDepth || childrenCount <= 0) { 
            return;
        }

        for (let i=0; i < childrenCount; i++) {
            const childOperation = `${parent} = Child ${i} at level ${currentLevel + 1}`
            const childSpan = await tracer.current.startSpan(childOperation);

            await sleep(childDelay);
            await sendSpanTree(childSpan, currentLevel + 1, maxDepth);
            tracer.current.finishSpan(childSpan);
        }
    }

    const sleep = (ms: number) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const onToggleIsError = () => {
        setIsError(!isError);
    };

    const onChildrenCountChanged = (newChildrenCount: string) => {
        const newChildrenCountNumber = parseInt(newChildrenCount, 10);
        if (!Number.isNaN(newChildrenCountNumber)) {
            setChildrenCount(newChildrenCountNumber);
        } else {
            setChildrenCount(DEFAULT_CHILDREN_COUNT);
        }
    };

    const onChildrenCountDecrease = () => {
        const newChildrenCount = childrenCount > 0 ? childrenCount - 1 : 0;
        setChildrenCount(newChildrenCount);
    };

    const onChildrenCountIncrease = () => {
        setChildrenCount(childrenCount + 1)
    };

    const onDepthChanged = (newDepth: string) => {
        const newDepthNumber = parseInt(newDepth, 10);
        if (!Number.isNaN(newDepthNumber)) {
            setDepth(newDepthNumber);
        } else {
            setDepth(DEFAULT_DEPTH);
        }
    };

    const onDepthDecrease = () => {
        const newDepth = depth > 1 ? depth - 1 : 1;
        setDepth(newDepth);
    };

    const onDepthIncrease = () => {
        setDepth(depth + 1);
    };

    const onChildDelayChanged = (newChildDelay: string) => {
        const newChildDelayNumber = parseInt(newChildDelay, 10);
        if (!Number.isNaN(newChildDelayNumber)) {
            setChildDelay(newChildDelayNumber);
        } else {
            setChildDelay(0);
        }
    };

    const onChildDelayDecrease = () => {
        const newChildDelay = childDelay > 0 ? childDelay - 1 : 0;
        setChildDelay(newChildDelay);
    };

    const onChildDelayIncrease = () => {
        setChildDelay(childDelay + 1);
    };

    return (
        <SafeAreaView style={styles.safeAreaContainer}>
            <View style={styles.container}>
                <Text style={styles.title}>SPAN CONFIGURATION</Text>
                <View style={styles.holder}>
                    <View style={styles.row}>
                        <TextInput
                            placeholderTextColor={Colors.Black}
                            style={styles.input}
                            value={spanOperation}
                            onChangeText={setSpanOperation}
                            />
                    </View>
                    <View style={styles.separator} />
                    <View style={styles.row}>
                        <TextInput
                            placeholderTextColor={Colors.Black}
                            style={styles.input}
                            value={spanResource}
                            onChangeText={setSpanResource}
                            />
                    </View>
                    <View style={styles.separator} />
                    <View style={styles.row}>
                        <Text style={styles.label}>{'isError'}</Text>
                        <Switch
                            trackColor={{false: Colors.Grey, true: Colors.DatadogPurple}}
                            thumbColor={Colors.White}
                            onValueChange={onToggleIsError}
                            value={isError}
                            />
                    </View>
                </View>
                <Text style={styles.title}>COMPLEX SPAN CONFIGURATION</Text>
                <View style={styles.holder}>
                    <View style={styles.row}>
                        <Text style={styles.label}>{'Children count:'}</Text>
                        <TextInput
                            style={[styles.smallInput, styles.inputBorder]}
                            value={childrenCount.toString()}
                            onChangeText={onChildrenCountChanged}
                            />
                        <Stepper
                            onDecreasePressed={onChildrenCountDecrease}
                            onIncreasePressed={onChildrenCountIncrease}
                            />
                    </View>
                    <View style={styles.separator} />
                    <View style={styles.row}>
                        <Text style={styles.label}>{'Depth:'}</Text>
                        <TextInput
                            style={[styles.smallInput, styles.inputBorder]}
                            value={depth.toString()}
                            onChangeText={onDepthChanged}
                            />
                        <Stepper
                            onDecreasePressed={onDepthDecrease}
                            onIncreasePressed={onDepthIncrease}
                            />
                    </View>
                    <View style={styles.separator} />
                    <View style={styles.row}>
                        <Text style={styles.label}>{'Child delay'}</Text>
                        <TextInput
                            style={[styles.smallInput, styles.inputBorder]}
                            value={childDelay.toString()}
                            onChangeText={onChildDelayChanged}
                            />
                        <Stepper
                            onDecreasePressed={onChildDelayDecrease}
                            onIncreasePressed={onChildDelayIncrease}
                            />
                    </View>

                </View>
                <View style={styles.buttonWrapper}>
                <Button
                    color={OS === 'android' ? Colors.DatadogPurple : Colors.White}
                    onPress={sendTraces}
                    title={isSending ? 'Sending...' : 'Send'}
                    disabled={isSending}
                />
                </View>
                {isSending && <ActivityIndicator/>}
                <Text style={styles.resultTitle}>{`Traces sent: ${tracesSentCount}`}</Text>
            </View>
        </SafeAreaView>
    );
}

export default TracesScenario;
