import {
    Alert,
    View,
} from 'react-native';
import React from 'react';
import { WebView } from "@datadog/mobile-react-native-webview";

import { CommonStyles as styles } from '../../../common/styles';

function Webview(): React.JSX.Element {
    const onError = () => {
        Alert.alert("Something went wrong, try again later.");
    };

    return (
        <View style={styles.fullScreenHolder}>
            <WebView 
                allowedHosts={['datadoghq.com/']}
                source={{ uri: 'https://www.datadoghq.com/' }} 
                style={styles.sessionReplayWebView} 
                onError={onError}
            />
        </View>
    )                
};

export default Webview;
