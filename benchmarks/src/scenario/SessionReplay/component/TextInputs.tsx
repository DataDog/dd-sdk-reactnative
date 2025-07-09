import {
    TextInput,
    View,
} from 'react-native';
import React from 'react';

import { CommonStyles as styles } from '../../../common/styles';

function TextInputs(): React.JSX.Element {
    return (
        <View style={styles.fullScreenHolder}>
            <TextInput 
                style={styles.sessionReplayTextInput}
                placeholder='Placeholder text'
                value='This is a text input'    
            />
            <TextInput 
                style={styles.sessionReplayTextInput}
                placeholder='Placeholder text'
            />
            <TextInput 
                style={styles.sessionReplayTextInput}
                placeholder='Placeholder text'
                value='Numeric keyboard'
                keyboardType='numeric'
            />
            <TextInput
                style={styles.sessionReplayTextInput}
                editable
                multiline
                numberOfLines={4}
                maxLength={40}
                value={'This is a multiline text input. This is a multiline text input. This is a multiline text input. This is a multiline text input.'}
            />
            <TextInput 
                style={styles.sessionReplayTextInput}
                placeholder='Password'
                secureTextEntry={true}
            />
        </View>
    )                
};

export default TextInputs;
