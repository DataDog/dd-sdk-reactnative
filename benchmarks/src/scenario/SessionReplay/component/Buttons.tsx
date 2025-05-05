import {
    Alert,
    Button,
    Pressable,
    Text,
    TouchableHighlight,
    TouchableOpacity,
    View,
} from 'react-native';
import React from 'react';

import { CommonStyles as styles } from '../../../common/styles';

function Buttons(): React.JSX.Element {
    return (
        <View style={styles.fullScreenHolder}>
            <Button 
                title='Button' 
                onPress={() => {Alert.alert('Pressed!')}}
            />
            <Pressable 
                style={styles.sessionReplayButton} 
                onPress={() => {Alert.alert('Pressed!')}}>
                <Text style={styles.sessionReplayButtonLabel}>Pressable</Text>
            </Pressable>
            <TouchableHighlight 
                style={styles.sessionReplayButton}  
                onPress={() => {Alert.alert('Pressed!')}}
            >
                <Text style={styles.sessionReplayButtonLabel} >Touchable</Text>
            </TouchableHighlight>
            <TouchableOpacity
                style={styles.sessionReplayButton}  
                onPress={() => {Alert.alert('Pressed!')}}
            >
                <Text style={styles.sessionReplayButtonLabel} >Touchable Opacity</Text>
            </TouchableOpacity>
        </View>
    )                
};

export default Buttons;
