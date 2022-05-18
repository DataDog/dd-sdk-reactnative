/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, { Component} from 'react';
import {
  View, Text, TouchableNativeFeedback
} from 'react-native';
import styles from './styles';
import CrashTester from 'react-native-crash-tester';
import {CrashingComponent}  from 'react-native-crash-tester';

interface ErrorScreenState {
  crashComponentVisible: boolean
}

export default class ErrorScreen extends Component<any, ErrorScreenState> {

    constructor(props: Readonly<any> | undefined) {
        super(props);
        this.state = {
            crashComponentVisible: false
        } as ErrorScreenState;
    }

    render() {
        return <View style={styles.defaultScreen}>
            <View style={{ marginTop: 40, alignItems: "center" }}>
                <TouchableNativeFeedback
                    style={{ marginTop: 20 }}
                    onPress={() => {
                        CrashTester.jsCrash('We just Crashed the JS Side');
                    }}>
                    <View style={styles.button}><Text>JS Crash</Text></View>
                </TouchableNativeFeedback>
                <TouchableNativeFeedback
                    style={{ marginTop: 20 }}
                    onPress={() => {
                        CrashTester.nativeCrash('We just crashed the native side');
                    }}>
                    <View style={styles.button}><Text>Native Crash</Text></View>
                </TouchableNativeFeedback>
                <TouchableNativeFeedback
                    style={{ marginTop: 20 }}
                    onPress={() => {
                        this.setState({ crashComponentVisible: true } as ErrorScreenState);
                    }}>
                    <View style={styles.button}><Text>Crashing Component</Text></View>
                </TouchableNativeFeedback>
                {this.state.crashComponentVisible && <CrashingComponent />}
            </View>
        </View>
    }
}
