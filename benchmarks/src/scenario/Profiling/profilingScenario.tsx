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
import type { ProfilingScenarioConfig, ProfilingScenarioProps } from './types';
import { DdRum } from '@datadog/mobile-react-native';
import { RunType } from '../../testSetup/types/testConfig';
import { instrument } from '../../testSetup/testUtils';
import {
    computePrimes,
    fibonacci,
    sortNumbers,
} from './profilingUtils';
import { Colors, CommonStyles as styles } from '../../common/styles';

const SORT_COUNT = 1_000_000;
const FIBONACCI_N = 35;
const PRIMES_LIMIT = 1_000_000;
const OS = Platform.OS;

function ProfilingScenario(props: ProfilingScenarioProps): React.JSX.Element {
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [lastResult, setLastResult] = useState<string>('');
    const [isJsProfilingEnabled, setIsJsProfilingEnabled] = useState<boolean>(false);
    const [isJsProfilingActive, setIsJsProfilingActive] = useState<boolean>(false);

    useEffect(() => {
        console.log(props.testConfig);
        if (props.testConfig?.runType !== RunType.BASELINE) {
            instrument().then(() => {
                const scenarioConfig = props.testConfig?.scenarioConfig as ProfilingScenarioConfig | undefined;
                console.log(scenarioConfig)

                if (scenarioConfig?.nativeProfilerEnabled) {
                    // TO DO
                }

                if (scenarioConfig?.jsProfilerEnabled) {
                    console.log("Enabling JS profiling")
                    setIsJsProfilingEnabled(true);
                    DdRum.startProfiling().then(() => {
                        console.log("Started JS profiling");
                        setIsJsProfilingActive(true)

                    });
                }
            });
        }
    }, []);

    const onStopJsProfiling = () => {
        DdRum.stopProfiling().then(tracePath => {
            setIsJsProfilingActive(false);
            setLastResult(`JS profiling stopped, trace saved at ${tracePath}`);
        });
    };

    const runWork = async (label: string, work: () => void) => {
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
                    {isJsProfilingEnabled && (
                        <View style={styles.buttonWrapper}>
                            <Button
                                color={OS === 'android' ? Colors.DatadogPurple : Colors.White}
                                onPress={onStopJsProfiling}
                                title="Stop JS Profiling"
                                disabled={!isJsProfilingActive}
                            />
                        </View>
                    )}
                </View>
                {isRunning && <ActivityIndicator/>}
                <Text style={styles.resultTitle}>{lastResult}</Text>
            </View>
        </SafeAreaView>
    );
}

export default ProfilingScenario;
