import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import React from 'react';

import { DatadogProvider } from '../../DatadogProvider';

const DefaultTestApp = () => {
    return (
        <View>
            <Text>I am a test application</Text>
        </View>
    );
};

export const renderWithProvider = (
    AppComponent: React.ReactNode = <DefaultTestApp />
) => {
    return render(<DatadogProvider>{AppComponent}</DatadogProvider>);
};
