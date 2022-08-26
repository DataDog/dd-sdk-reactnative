import { render } from '@testing-library/react-native';
import { Animated, Button, Text, View } from 'react-native';
import React, { useState } from 'react';

import { DatadogProviderConfiguration } from '../../../DdSdkReactNativeConfiguration';
import { DatadogProvider } from '../../DatadogProvider';

const DefaultTestApp = () => {
    return (
        <View>
            <Text>I am a test application</Text>
            <Button title="test button" onPress={() => {}} />
        </View>
    );
};

const AppWithAnimation = () => {
    const [opacity] = useState(new Animated.Value(0));
    Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false
    }).start();

    return (
        <View>
            <Button onPress={() => {}} title="test button" />
            <Animated.View style={{ opacity }} />
        </View>
    );
};

export const defaultConfiguration = new DatadogProviderConfiguration(
    'fakeToken',
    'fakeEnv',
    'fakeApplicationId',
    true,
    false, // TODO: the initialization is broken with trackResources in test, fix it
    true
);

export const renderWithProviderAndAnimation = (params?: {
    configuration?: DatadogProviderConfiguration;
}) => {
    return renderWithProvider({
        AppComponent: <AppWithAnimation />,
        configuration: params?.configuration
    });
};

export const renderWithProvider = (params?: {
    AppComponent?: React.ReactNode;
    configuration?: DatadogProviderConfiguration;
}) => {
    const AppComponent = params?.AppComponent || <DefaultTestApp />;
    const configuration = params?.configuration || defaultConfiguration;

    const result = render(
        <DatadogProvider configuration={configuration}>
            {AppComponent}
        </DatadogProvider>
    );

    const rerenderWithRandomConfig = () => {
        const randomConfiguration = new DatadogProviderConfiguration(
            Math.random().toString(),
            'fakeEnv',
            'fakeApplicationId',
            true,
            false,
            true
        );
        result.rerender(
            <DatadogProvider configuration={randomConfiguration}>
                {AppComponent}
            </DatadogProvider>
        );
    };

    return {
        ...result,
        rerenderWithRandomConfig
    };
};
