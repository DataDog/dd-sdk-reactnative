import { useState, useCallback } from 'react';
import {
    View,
    Button,
    NativeSyntheticEvent,
    TextInput,
    Pressable,
    TouchableOpacity
} from 'react-native';

function MyComponent() {
    return (
        <TouchableOpacity style={styles.button} onPress={() => {}}>
            <Text style={styles.buttonText}>
                {this.props.title || 'Click Me'}
            </Text>
        </TouchableOpacity>
    );
}
