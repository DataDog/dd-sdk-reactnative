import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import React from 'react';

import { DdSdkReactNativeConfiguration } from '../../../DdSdkReactNativeConfiguration';
import { DatadogProvider } from '../../DatadogProvider';

const DefaultTestApp = () => {
    return (
        <View>
            <Text>I am a test application</Text>
        </View>
    );
};

const defaultConfiguration = new DdSdkReactNativeConfiguration(
    'fakeToken',
    'fakeEnv',
    'fakeApplicationId',
    true,
    true,
    true
);

export const renderWithProvider = (params?: {
    AppComponent?: React.ReactNode;
    configuration?: DdSdkReactNativeConfiguration;
}) => {
    const AppComponent = params?.AppComponent || <DefaultTestApp />;
    const configuration = params?.configuration || defaultConfiguration;

    const result = render(
        <DatadogProvider configuration={configuration}>
            {AppComponent}
        </DatadogProvider>
    );

    const rerenderWithRandomConfig = () => {
        const randomConfiguration = new DdSdkReactNativeConfiguration(
            Math.random().toString(),
            'fakeEnv',
            'fakeApplicationId',
            true,
            true,
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
