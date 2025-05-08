import { useNavigation } from '@react-navigation/native';
import { View, Text, TouchableNativeFeedback, Button } from 'react-native';
import React from 'react';

import type { StackNavigation } from '../NavigationRoot';
import { about } from '../resources/strings.json';

import styles from './styles';

const AboutScreen = () => {
    const navigation = useNavigation<StackNavigation>();
    return (
        <View style={styles.defaultScreen}>
            <Text>Result: {about} </Text>
            <TouchableNativeFeedback
                accessibilityLabel="click_me_about"
                onPress={() => {
                    console.error('Not implemented', Error('Oups'));
                }}
            >
                <View style={{ ...styles.button, marginBottom: 24 }}>
                    <Text>Click me</Text>
                </View>
            </TouchableNativeFeedback>
            <Button
                title="go to nested"
                onPress={() => navigation.navigate('Nested')}
            />
        </View>
    );
};

export default AboutScreen;
