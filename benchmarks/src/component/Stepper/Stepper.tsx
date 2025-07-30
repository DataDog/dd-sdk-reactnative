/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React from 'react';
import {
    Pressable,
    Text,
    View,
} from 'react-native';
import type { StepperProps } from "./types";
import styles from "./styles";

function Stepper(props: StepperProps): React.JSX.Element {
    return (
        <View style={styles.container}>
            <Pressable onPress={props.onDecreasePressed}>
                <Text style={styles.buttonLabel}>{'-'}</Text>
            </Pressable>
            <View style={styles.separator}/>
            <Pressable onPress={props.onIncreasePressed}>
                <Text style={styles.buttonLabel}>{'+'}</Text>
            </Pressable>
        </View>
    );
}

export default Stepper;