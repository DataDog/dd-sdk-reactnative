/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { Dimensions, StyleSheet } from "react-native";

const SCR_WIDTH = Dimensions.get('screen').width;
const SCR_HEIGHT = Dimensions.get('screen').height;

export enum Colors {
    White = '#FFFFFF',
    Black = '#000000',
    Grey = '#EEEEEF',
    DarkGrey = '#9E9E9F',
    DatadogPurple = '#BC72E4',
    Background = '#F2F2F7',
    Title = '#AFAFA0',
}

export const CommonStyles = StyleSheet.create({
    safeAreaContainer: {
        flex: 1,
        backgroundColor: Colors.Grey,
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    uiItemsContainer: {
        flex: 1,
        backgroundColor: Colors.White,
        paddingHorizontal: 10,
    },
    lightContainer: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: Colors.White,
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
    fullScreenHolder: {
        flex: 1,
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: Colors.White,
    },
    separator: {
        height: 1,
        width: '100%',
        backgroundColor: Colors.Background,
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
    },
    image: {
        height: 150,
        padding: 10,
        borderRadius: 10,
        backgroundColor: Colors.White,
    },
    resultTitle: {
        fontSize: 16,
        color: Colors.Black,
        marginTop: 15,
        textAlign: 'center',
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 10,
    },
    resultList: {
        borderRadius: 10,
    },
    resultCell: {
        flex: 1,
        padding: 10,
        backgroundColor: Colors.White,
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    cellImage: {
        height: 60,
        width: 60,
        borderRadius: 5,
        marginRight: 10,
    },
    cellTitle: {
        fontSize: 18,
        fontWeight: 500,
    },
    cellContent: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: Colors.Background,
        paddingBottom: 10,
    },
    cellArrow: {
        color: Colors.DarkGrey,
        lineHeight: 60,
        fontSize: 20,
        paddingHorizontal: 10,
    },
    detailImage: {
        height: 120,
        width: 120,
    },
    detailTitle: {
        marginVertical: 10,
        fontSize: 18,
        fontWeight: 500,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailLabel: {
        color: Colors.DarkGrey,
    },
    detailField: {

    },
    expandedContentEntry: {
        paddingVertical: 10,
    },
    gridItem: {
        padding: 10,
    },
    gridItemLabel: {
        width: 100,
        marginVertical: 10,
        fontSize: 16,
        fontWeight: 500,
        textAlign: 'center',
    },
    gridImage: {
        height: 100,
        width: 100,
    },
    uiElementCell: {
        padding: 15,
        flex: 1,
        backgroundColor: Colors.White,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignContent: 'space-around',
        borderBottomWidth: 1,
        borderBottomColor: Colors.Grey,
    },
    uiElementTitle: {
        flex: 0.9,
        fontSize: 25,
    },
    uiElementArrow: {
        flex: 0.1,
        color: Colors.DatadogPurple,
        fontSize: 25,
    },
    sessionReplayView: {
        height: 250,
        width: 250,
        backgroundColor: 'green',
        marginVertical: 30,
    },
    sessionReplayRotatedView: {
        backgroundColor: 'blue',
        transform: [{ rotate: '30deg' }],
    },
    sessionReplayOpacityView:{
        backgroundColor: 'yellow',
    },
    sessionReplayOpacityViewChild:{
        backgroundColor: 'blue',
        opacity: 0.2,
        height: 100,
        width: 100,
    },
    sessionReplayContainerView:{
        backgroundColor: 'purple',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sessionReplayContainerViewText:{
        color: Colors.White,
        fontSize: 20,
    },
    sessionReplayImage: {
        width: 350,
        height: 350,
    },
    sessionReplayText: {
        color: Colors.DatadogPurple,
        fontSize: 16,
        textAlign: 'left',
        marginVertical: 10,
    },
    sessionReplayTextCursive: {
        color: Colors.Black,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    sessionReplayTextBold: {
        color: Colors.DarkGrey,
        fontWeight: '900',
        textAlign: 'right',
    },
    sessionReplayTextSpaced: {
        color: Colors.DatadogPurple,
        letterSpacing: 10,
        lineHeight: 25,
    },
    sessionReplayTextInput: {
        marginVertical: 15,
        backgroundColor: Colors.Grey,
        width: '80%',
        fontSize: 20,
        padding: 10,
        borderRadius: 10,
    },
    sessionReplaySwitch: {
        marginVertical: 30,
    },
    sessionReplayButton: {
        marginVertical: 20,
        backgroundColor: Colors.DatadogPurple,
        width: '80%',
        padding: 20,
        borderRadius: 15,
        color: Colors.White,
    },
    sessionReplayButtonLabel: {
        color: Colors.White,
        textAlign: 'center',
        fontSize: 20,
    },
    sessionReplayActivityIndicator : {
        marginVertical: 50,
    },
    sessionReplayPicker: {

    },
    sessionReplaySlider: {
        width: 200,
        height: 40,
        marginVertical: 40,
    },
    sessionReplayWebView: {
        height: SCR_HEIGHT, 
        width: SCR_WIDTH,
    },
    sessionReplaySectionList: {
        width: SCR_WIDTH,
    },
    sessionReplaySectionListItem: {
        backgroundColor: Colors.DatadogPurple,
        padding: 20,
        marginVertical: 8,
    },
    sessionReplaySectionListItemTitle: {
        color: Colors.White,
    },
    sessionReplaySectionListHeader: {
        fontSize: 32,
        backgroundColor: Colors.White,
    },
})
