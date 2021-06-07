import React from 'react';
import { View, Text, Button } from 'react-native';
import { Navigation } from 'react-native-navigation';
import MainScreen from './screens/MainScreen';
import AboutScreen from './screens/AboutScreen';
import { DdRumReactNativeNavigationTracking }  from 'dd-sdk-reactnative';


import styles from './screens/styles';

function startReactNativeNavigation() {
    DdRumReactNativeNavigationTracking.startTracking();
    registerScreens();
    Navigation.events().registerAppLaunchedListener(async () => {
      Navigation.setRoot({
        root: {
          stack: {
            children: [
              { component: { name: 'Home' } }
            ]
          }
        }
      });
    });
}

function registerScreens() {
    Navigation.registerComponent('Home', () => HomeScreen);
    Navigation.registerComponent('Main', () => MainScreen);
    Navigation.registerComponent('About', () => AboutScreen);
} 


const HomeScreen = (props) => {
  return (
    <View style={styles.defaultScreen}>
      <Text style = {{ marginBottom: 20 }}>Hello React Native Navigation 👋</Text>
      <Button
        title='Main'
        onPress={() => {
            Navigation.push(props.componentId, { component: { name: 'Main' } });
        }}/>
      <View 
        style = {{ marginTop: 20 }} />
      <Button
        title='About'
        onPress={() => {
            Navigation.push(props.componentId, { component: { name: 'About' } });
        }}/>
    </View>
  );
};

export { startReactNativeNavigation };