import {
    ActivityIndicator,
    View,
} from 'react-native';
import React from 'react';

import { Colors, CommonStyles as styles } from '../../../common/styles';

function ActivityIndicators(): React.JSX.Element {
    return (
        <View style={styles.fullScreenHolder}>
            <ActivityIndicator style={styles.sessionReplayActivityIndicator}/>
            <ActivityIndicator style={styles.sessionReplayActivityIndicator} size={'large'}/>
            <ActivityIndicator style={styles.sessionReplayActivityIndicator} size={'small'} color={Colors.DatadogPurple}/>
            <ActivityIndicator style={styles.sessionReplayActivityIndicator} size={'large'} color={Colors.DatadogPurple}/>
        </View>
    )                
};

export default ActivityIndicators;
