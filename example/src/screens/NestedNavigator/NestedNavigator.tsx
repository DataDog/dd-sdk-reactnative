import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import type { NestedStackParamList } from '../../NavigationRoot';

import { ScreenWithLinks } from './ScreenWithLinks';

export const { Screen, Navigator } =
    createNativeStackNavigator<NestedStackParamList>();

export const NestedNavigator = () => {
    return (
        <Navigator>
            <Screen
                name="Screen1"
                component={ScreenWithLinks}
                initialParams={{ links: [{ routeName: 'Screen2' }] }}
            />
            <Screen
                name="Screen2"
                component={ScreenWithLinks}
                initialParams={{
                    links: [{ routeName: 'Screen1' }, { routeName: 'About' }]
                }}
            />
        </Navigator>
    );
};
