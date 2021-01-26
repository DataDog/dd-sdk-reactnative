import React, {Component} from 'react';
import { View, Text } from 'react-native';
import styles from './styles';
import {about} from '../resources/strings.json';

export default class AboutScreen extends Component<any, any> {
   
    render(){
       return <View style={styles.defaultScreen}>
         <Text>Result: {about} </Text>
      </View>
    }
}