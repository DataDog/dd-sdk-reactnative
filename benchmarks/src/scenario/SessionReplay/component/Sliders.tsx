import {
  View,
} from 'react-native';
import React from 'react';
import Slider from '@react-native-community/slider';

import { Colors, CommonStyles as styles } from '../../../common/styles';

function Sliders(): React.JSX.Element {
    return (
        <View style={styles.fullScreenHolder}>
            <Slider
                style={styles.sessionReplaySlider}
                minimumValue={0}
                maximumValue={1}
                value={0.5}
                minimumTrackTintColor={Colors.Grey}
                maximumTrackTintColor={Colors.DatadogPurple}
                />
            <Slider
                style={styles.sessionReplaySlider}
                minimumValue={0}
                maximumValue={1}
                minimumTrackTintColor={Colors.Grey}
                maximumTrackTintColor={Colors.DatadogPurple}
                disabled={true}
                />
            <Slider
                style={styles.sessionReplaySlider}
                minimumValue={0}
                maximumValue={1}
                step={0.2}
                value={0.2}
                minimumTrackTintColor={Colors.Grey}
                maximumTrackTintColor={Colors.DatadogPurple}
                />
            <Slider
                style={styles.sessionReplaySlider}
                minimumValue={0}
                maximumValue={1}
                minimumTrackTintColor={Colors.Grey}
                maximumTrackTintColor={Colors.DatadogPurple}
                thumbImage={require('./assets/bits.png')}
                />
        </View>
    )                
};

export default Sliders;
