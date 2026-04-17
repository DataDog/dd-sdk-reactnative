/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { render } from '@testing-library/react-native';
import { Animated, Button, Text, View } from 'react-native';
import React, { useState } from 'react';

import { DatadogProviderConfiguration } from '../../../../config/DatadogProviderConfiguration';
import type { AutoInstrumentationConfiguration } from '../../../../config/async/AutoInstrumentationConfiguration';
import { RumConfiguration } from '../../../../config/features/RumConfiguration';
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

export const getDefaultConfiguration = () => {
    const defaultConfiguration = new DatadogProviderConfiguration(
        'fakeToken',
        'fakeEnv'
    );

    // TODO: the initialization is broken with trackResources in test, fix it
    defaultConfiguration.rumConfiguration = new RumConfiguration(
        'fakeApplicationId',
        true,
        false,
        true
    );

    return defaultConfiguration;
};

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
            'fakeEnv'
        );
        randomConfiguration.rumConfiguration = new RumConfiguration(
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
 * Mocks requestIdleCallback so that scheduled callbacks only run when
 * {@link flushIdleCallbacks} is called. Restores the original value on
 * {@link restore}.
 */
export const mockIdleCallback = () => {
    const callbacks: Array<() => void> = [];
    const original = (globalThis as Record<string, unknown>)
        .requestIdleCallback;

    (globalThis as Record<string, unknown>).requestIdleCallback = (
        cb: () => void
    ) => {
        callbacks.push(cb);
        return callbacks.length;
    };

    return {
        flushIdleCallbacks: () => {
            callbacks.splice(0).forEach(cb => cb());
        },
        restore: () => {
            (globalThis as Record<
                string,
                unknown
            >).requestIdleCallback = original;
        }
    };
};
