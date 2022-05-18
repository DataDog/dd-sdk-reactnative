import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ScreenWithLinks } from './ScreenWithLinks';

const { Screen, Navigator } = createStackNavigator();

export const NestedNavigator = () => {
    return (<Navigator>
        <Screen name="Screen1" component={() => <ScreenWithLinks links={[{routeName: 'Screen2'}]} />} />
        <Screen name="Screen2" component={() => <ScreenWithLinks links={[{routeName: 'Screen1'}, {routeName: 'About'}]} />} />
    </Navigator>)
}