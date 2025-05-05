/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { StyleSheet } from "react-native";
import { Colors } from "../../common/styles";

export default StyleSheet.create({
    container: {
        backgroundColor: Colors.Grey,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderRadius: 10,
        maxWidth: '30%',
    },
    separator: {
        backgroundColor: Colors.DarkGrey,
        width: 1,
        height: 20,
        marginTop: 5,
        marginBottom: 5,
    },
    buttonLabel: {
        color: Colors.Black,
        minWidth: '45%',
        textAlign: 'center',
        fontSize: 24,
    },
})