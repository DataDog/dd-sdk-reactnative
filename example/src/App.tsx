import * as React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MainScreen  from './screens/MainScreen';
import AboutScreen from './screens/AboutScreen';
import style from './screens/styles';
import { navigationRef } from './NavigationRoot';
import { registerNavigationStateListener } from './utils/NavigationUtils';


const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer ref={navigationRef} onReady={()=>
    {
      registerNavigationStateListener(navigationRef.current)
    }}> 
      <Tab.Navigator tabBarOptions={{
        labelStyle:style.tabLabelStyle,
        tabStyle:style.tabItemStyle
        }}>
        <Tab.Screen name="Home" component={MainScreen} />
        <Tab.Screen name="About" component={AboutScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  )
}
