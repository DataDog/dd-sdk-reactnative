/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { StyleSheet } from "react-native";

export enum Colors {
    White = '#FFFFFF',
    Black = '#000000',
    Grey = '#EEEEEF',
    DarkGrey = '#9E9E9F',
    DatadogPurple = '#BC72E4',
    Background = '#F2F2F7',
    Title = '#AFAFA0',
    Separator = '#F2F2F7',
}

export const CommonStyles = StyleSheet.create({
    safeAreaContainer: {
        flex: 1,
        backgroundColor: Colors.Background,
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    title: {
        paddingLeft: 20,
        fontSize: 13,
        color: Colors.Title,
    },
    holder: {
        backgroundColor: Colors.White,
        borderRadius: 15,
        padding: 15,
        marginTop: 5,
        marginBottom: 20,
    },
    separator: {
        height: 1,
        width: '100%',
        backgroundColor: Colors.Separator,
    },
    input: {
        flex: 1,
    },
    smallInput: {
        flex: 0.5,
        maxWidth: '25%',
    },
    inputBorder: {
        padding: 5,
        borderColor: Colors.Grey,
        borderWidth: 1,
    },
    row: {
        minHeight: '5%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        color: Colors.Black,
        fontSize: 15,
        marginRight: 20,
    },
    buttonWrapper: {
        backgroundColor: Colors.DatadogPurple,
        borderRadius: 10,
        padding: 5,
        marginBottom: 20,
    },
    greyButton: {
        backgroundColor: Colors.Grey,
    },
    logEntry: {
        padding: 5,
        borderBottomColor: Colors.Grey,
        borderBottomWidth: 1,
        fontSize: 12,
    }
})