/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { NavigationContainerRef } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, Button } from 'react-native';
import React from 'react';

const { Screen, Navigator } = createStackNavigator();

export function FakeAboutScreen({ navigation }) {
    return (
        <View>
            <Text>Welcome to About</Text>
        </View>
    );
}

export function FakeHomeScreen({ navigation }) {
    return (
        <View>
            <Text>Welcome to Home</Text>
            <Button
                title="Go to About"
                onPress={() => {
                    navigation.navigate('About');
                }}
            />
        </View>
    );
}

export function FakeSettingsScreen({ navigation }) {
    return (
        <View>
            <Text>Welcome to About</Text>
        </View>
    );
}

export function FakeProfileScreen({ navigation }) {
    return (
        <Navigator>
            <Screen name="Home" component={FakeHomeScreen} />
            <Screen name="About" component={FakeAboutScreen} />
        </Navigator>
    );
}

export function FakeNavigator1(props: {
    navigationRef: React.RefObject<NavigationContainerRef>;
}) {
    return (
        <NavigationContainer ref={props.navigationRef}>
            <Navigator>
                <Screen name="Home" component={FakeHomeScreen} />
                <Screen name="About" component={FakeAboutScreen} />
            </Navigator>
        </NavigationContainer>
    );
}

export function FakeNavigator2(props: {
    navigationRef: React.RefObject<NavigationContainerRef>;
}) {
    return (
        <NavigationContainer ref={props.navigationRef}>
            <Navigator>
                <Screen name="Home" component={FakeHomeScreen} />
                <Screen name="About" component={FakeAboutScreen} />
            </Navigator>
        </NavigationContainer>
    );
}

export function FakeNestedNavigator(props: {
    navigationRef: React.RefObject<NavigationContainerRef>;
}) {
    return (
        <NavigationContainer ref={props.navigationRef}>
            <Navigator>
                <Screen name="Profile" component={FakeProfileScreen} />
                <Screen name="Settings" component={FakeSettingsScreen} />
            </Navigator>
        </NavigationContainer>
    );
}
