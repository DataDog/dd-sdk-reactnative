import {
    Text,
    ScrollView,
    View,
} from 'react-native';
import React from 'react';

import { CommonStyles as styles } from '../../../common/styles';

function Views(): React.JSX.Element {
    return (
        <ScrollView>
            <View style={styles.fullScreenHolder}>
                <View style={styles.sessionReplayView}/>
                <View style={[styles.sessionReplayView, styles.sessionReplayRotatedView]}/>
                <View style={[styles.sessionReplayView, styles.sessionReplayOpacityView]}>
                    <View style={styles.sessionReplayOpacityViewChild}/>
                </View>
                <View style={[styles.sessionReplayView, styles.sessionReplayContainerView]}>
                    <Text style={styles.sessionReplayContainerViewText}>{"Container"}</Text>
                </View>
            </View>
        </ScrollView>
    )                
};

export default Views;
