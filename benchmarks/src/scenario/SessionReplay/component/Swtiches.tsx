import {
    Switch,
    View,
} from 'react-native';
import React, { useState } from 'react';

import { CommonStyles as styles } from '../../../common/styles';

function Switches(): React.JSX.Element {
    const [isEnabled, setIsEnabled] = useState(false);
    const toggleSwitch = () => setIsEnabled(previousState => !previousState);

    return (
        <View style={styles.fullScreenHolder}>
            <Switch
                style={styles.sessionReplaySwitch}
                onValueChange={toggleSwitch}
                value={isEnabled}
            />
            <Switch
                style={styles.sessionReplaySwitch}
                disabled={true}
            />
            <Switch
                style={styles.sessionReplaySwitch}
                trackColor={{false: '#767577', true: '#81b0ff'}}
                thumbColor={isEnabled ? '#f5dd4b' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggleSwitch}
                value={isEnabled}
            />
        </View>
    )                
};

export default Switches;
