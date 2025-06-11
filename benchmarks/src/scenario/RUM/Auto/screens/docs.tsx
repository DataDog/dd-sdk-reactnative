/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React from 'react';
import { WebView } from "@datadog/mobile-react-native-webview";
import { Alert, SafeAreaView } from 'react-native';
import { CommonStyles as styles} from '../../../../common/styles';

function DocsScreen(): React.JSX.Element {    
    const onError = () => {
        Alert.alert("Something went wrong, try again later.");
    };

    return (
        <SafeAreaView style={styles.safeAreaContainer}>
            <WebView 
                allowedHosts={['rickandmortyapi.com']}
                source={{ uri: 'https://rickandmortyapi.com/documentation/' }} 
                style={{ flex: 1 }} 
                onError={onError}
            />
        </SafeAreaView>
    );
};

export default DocsScreen;