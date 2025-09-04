import {
    Image,
    ScrollView,
    View,
} from 'react-native';
import React from 'react';

import { CommonStyles as styles } from '../../../common/styles';

function ImageViews(): React.JSX.Element {
    return (
        <ScrollView>
            <View style={styles.fullScreenHolder}>
                <Image source={{uri: "https://picsum.photos/800/600?random=1"}} style={styles.sessionReplayImage} resizeMode="cover" />
                <Image source={{uri: "https://picsum.photos/800/600?random=2"}} style={styles.sessionReplayImage} resizeMode="cover" />
                <Image source={{uri: "https://picsum.photos/800/600?random=3"}} style={styles.sessionReplayImage} resizeMode="cover" />
                <Image source={{uri: "https://picsum.photos/800/600?random=4"}} style={styles.sessionReplayImage} resizeMode="cover" />
                <Image source={{uri: "https://picsum.photos/800/600?random=5"}} style={styles.sessionReplayImage} resizeMode="cover" />
            </View>
        </ScrollView>
    )                
};

export default ImageViews;
