import {
  View,
} from 'react-native';
import React, { useState } from 'react';

import { CommonStyles as styles } from '../../../common/styles';
import CustomPicker from '../../../component/Picker/Picker';
import { Dog, TEST_DOGS } from '../constants';

function Picker(): React.JSX.Element {
    const [value, setValue] = useState("Select a dog");

    const setNewValue = (newValue: Dog | unknown) => {
        setValue(newValue as Dog);
    };

    return (
        <View style={styles.fullScreenHolder}>
            <CustomPicker 
                label={value}
                values={TEST_DOGS}
                onValueChange={setNewValue}/>
        </View>
    )                
};

export default Picker;
