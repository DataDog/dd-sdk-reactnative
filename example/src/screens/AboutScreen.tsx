import React, {Component} from 'react';
import { View, Text, TouchableNativeFeedback, Button } from 'react-native';
import styles from './styles';
import {about} from '../resources/strings.json';

export default class AboutScreen extends Component<any, any> {
   
    render(){
       return <View style={styles.defaultScreen}>
         <Text>Result: {about} </Text>
         <TouchableNativeFeedback
          accessibilityLabel="click_me_about"
          onPress={() => {
            console.error("Not implemented", Error("Oups"));
          }}>
          <View style={styles.button}>
            <Text>Click me</Text>
          </View>
        </TouchableNativeFeedback>
        <Button title="go to nested" onPress={() => this.props.navigation.navigate('Nested')} />
      </View>
    }
}