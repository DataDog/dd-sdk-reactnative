/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { NavigationContainerRef } from '@react-navigation/native-v5';
import { NavigationContainer } from '@react-navigation/native-v5';
import { createStackNavigator } from '@react-navigation/stack-v5';
import { View, Text, Button } from 'react-native';
import React, { useEffect, useState } from 'react';

import { DdRumReactNavigationTracking } from '../../../../../rum/instrumentation/DdRumReactNavigationTracking';

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
            <Text>Welcome to Settings</Text>
            <Button
                title="Go to Nested Home"
                onPress={() => {
                    navigation.navigate('NestedStack');
                }}
            />
        </View>
    );
}

export function FakeProfileScreen({ navigation }) {
    return (
        <Navigator>
            <Screen name="Home" component={FakeHomeScreen} />
            <Screen name="About" component={FakeSettingsScreen} />
        </Navigator>
    );
}

export function FakeNestedStack({ navigation }) {
    return (
        <Navigator>
            <Screen name="NestedHome" component={FakeHomeScreen} />
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
                <Screen name="NestedStack" component={FakeNestedStack} />
            </Navigator>
        </NavigationContainer>
    );
}

export function FakeTogglableNavigator(props: {
    navigationRef: React.RefObject<NavigationContainerRef>;
}) {
    const [showNavigator, setShowNavigator] = useState(true);
    const FakeToggleScreen = (screenProps: any) => {
        return (
            <Button
                title={screenProps.route.params.text || 'no text provided'}
                onPress={() => setShowNavigator(s => !s)}
            />
        );
    };

    const navigationRef = props.navigationRef;

    useEffect(() => {
        DdRumReactNavigationTracking.stopTrackingViews(navigationRef.current);
    }, [showNavigator]);

    return showNavigator ? (
        <NavigationContainer
            ref={navigationRef}
            onReady={() => {
                DdRumReactNavigationTracking.startTrackingViews(
                    navigationRef.current
                );
            }}
        >
            <Navigator>
                <Screen
                    name="Profile1"
                    component={FakeToggleScreen}
                    initialParams={{ text: 'display nav 2' }}
                />
            </Navigator>
        </NavigationContainer>
    ) : (
        <Button
            title="display nav 1"
            onPress={() => setShowNavigator(s => !s)}
        />
    );
}
