/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { render } from '@testing-library/react-native';
import { Animated, Button, InteractionManager, Text, View } from 'react-native';
import React, { useState } from 'react';

import type { AutoInstrumentationConfiguration } from '../../../DdSdkReactNativeConfiguration';
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

export const getDefaultConfiguration = () =>
    new DatadogProviderConfiguration(
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
    configuration?:
        | DatadogProviderConfiguration
        | AutoInstrumentationConfiguration;
    onInitialization?: () => void;
}) => {
    const AppComponent = params?.AppComponent || <DefaultTestApp />;
    const configuration = params?.configuration || getDefaultConfiguration();

    const result = render(
        <DatadogProvider
            configuration={configuration}
            onInitialization={params?.onInitialization}
        >
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

/**
 * Mocks an animation for InteractionManager.runAfterInteractions. Returns
 * a function to be called to finish the animation
 */
export const mockAnimation = () => {
    const fakeAnimationHandle = InteractionManager.createInteractionHandle();

    return {
        finishAnimation: () =>
            InteractionManager.clearInteractionHandle(fakeAnimationHandle)
    };
};
