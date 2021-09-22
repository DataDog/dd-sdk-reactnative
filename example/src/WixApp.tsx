import React from 'react';
import { View, Text, Button } from 'react-native';
import { Navigation } from 'react-native-navigation';
import MainScreen from './screens/MainScreen';
import AboutScreen from './screens/AboutScreen';
import { DdRumReactNativeNavigationTracking, ViewNamePredicate }  from '@datadog/mobile-react-native-navigation';


import styles from './screens/styles';

const viewPredicate: ViewNamePredicate = function customViewNamePredicate(trackedView: any, trackedName: string) {
  console.log(trackedView);
  return "Custom RNN " + trackedName;
}


function startReactNativeNavigation() {
    DdRumReactNativeNavigationTracking.startTracking(viewPredicate);
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