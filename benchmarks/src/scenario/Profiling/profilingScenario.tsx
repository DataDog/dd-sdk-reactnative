/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Button,
    Platform,
    SafeAreaView,
    Text,
    View,
} from 'react-native';
import type { ProfilingScenarioProps } from './types';
import { DdProfiling } from '@datadog/mobile-react-native-profiling';
import { RunType } from '../../testSetup/types/testConfig';
import { instrument } from '../../testSetup/testUtils';
import {
    blockJsThread,
    computePrimes,
    fibonacci,
    sortNumbers,
} from './profilingUtils';
import { Colors, CommonStyles as styles } from '../../common/styles';

const OS = Platform.OS;
const SORT_COUNT = 1_000_000;
const FIBONACCI_N = 35;
const PRIMES_LIMIT = 1_000_000;
const LONG_TASK_DURATION_MS = 500;

function ProfilingScenario(props: ProfilingScenarioProps): React.JSX.Element {
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [lastResult, setLastResult] = useState<string>('');

    useEffect(() => {
        console.log(props.testConfig);
        const runType = props.testConfig?.runType;
        if (runType !== RunType.BASELINE) {
            instrument().then(async () => {
                if (runType === RunType.INSTRUMENTED_PROFILING_NATIVE) {
                    console.log("Enabling native profiling");
                    await DdProfiling.enable({
                        applicationLaunchSampleRate: 100,
                        continuousSampleRate: 100,
                    });
                }
            });
        }
    }, []);

    const runWork = (label: string, work: () => void) => {
        setIsRunning(true);
        setLastResult('');

        const startTime = performance.now();
        work();
        const durationMs = performance.now() - startTime;

        setLastResult(`${label} took ${durationMs.toFixed(0)}ms`);
        setIsRunning(false);
    };

    const onSortNumbers = () => runWork(`Sort ${SORT_COUNT} numbers`, () => sortNumbers(SORT_COUNT));
    const onFibonacci = () => runWork(`Fibonacci(${FIBONACCI_N})`, () => fibonacci(FIBONACCI_N));
    const onComputePrimes = () => runWork(`Primes up to ${PRIMES_LIMIT}`, () => computePrimes(PRIMES_LIMIT));
    const onLongTask = () => runWork('JS long task', () => blockJsThread(LONG_TASK_DURATION_MS));

    return (
        <SafeAreaView style={styles.safeAreaContainer}>
            <View style={styles.container}>
                <Text style={styles.title}>PROFILING SCENARIO</Text>
                <View style={styles.holder}>
                    <View style={styles.buttonWrapper}>
                        <Button
                            color={OS === 'android' ? Colors.DatadogPurple : Colors.White}
                            onPress={onSortNumbers}
                            title="Sort numbers"
                            disabled={isRunning}
                        />
                    </View>
                    <View style={styles.buttonWrapper}>
                        <Button
                            color={OS === 'android' ? Colors.DatadogPurple : Colors.White}
                            onPress={onFibonacci}
                            title="Fibonacci"
                            disabled={isRunning}
                        />
                    </View>
                    <View style={styles.buttonWrapper}>
                        <Button
                            color={OS === 'android' ? Colors.DatadogPurple : Colors.White}
                            onPress={onComputePrimes}
                            title="Compute primes"
                            disabled={isRunning}
                        />
                    </View>
                    <View style={styles.buttonWrapper}>
                        <Button
                            color={OS === 'android' ? Colors.DatadogPurple : Colors.White}
                            onPress={onLongTask}
                            title={`Trigger JS long task (${LONG_TASK_DURATION_MS}ms)`}
                            disabled={isRunning}
                        />
                    </View>
                </View>
                {isRunning && <ActivityIndicator/>}
                <Text style={styles.resultTitle}>{lastResult}</Text>
            </View>
        </SafeAreaView>
    );
}

export default ProfilingScenario;
