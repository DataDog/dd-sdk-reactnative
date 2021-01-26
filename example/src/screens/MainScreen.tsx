import React, {Component} from 'react';
import { View, Text, Button } from 'react-native';
import styles from './styles';
import { APPLICATION_ID, CLIENT_TOKEN, ENVIRONMENT } from '@env';
import {
    DdSdk,
    DdSdkConfiguration,
    DdLogs,
    DdRum,
  } from 'dd-sdk-reactnative';
  
interface MainScreenState{
    result: String;
}


export default class MainScreen extends Component<any, MainScreenState> {
   
    constructor(props: Readonly<any> | undefined){
        super(props);
        this.state = {result: "random string"} as MainScreenState;
        let config = new DdSdkConfiguration(
            APPLICATION_ID,
            CLIENT_TOKEN,
            ENVIRONMENT
          );
      
          DdSdk.initialize(config).then(() => {
      
            DdLogs.info('This is a log sent from react-native', {
              foo: 42,
              bar: 'xyz',
            }).then(() => {
              this.setState({result:"Log Sent!"} as MainScreenState);
            });
          }); 
    }

    render(){
       return <View style={styles.defaultScreen}>
        <Text>Result: {this.state.result}</Text>
        <Button
          title="Click me"
          onPress={() => {
            DdRum.addAction('TAP', 'button1', new Date().getTime(), {});
            DdRum.startResource(
              '1',
              'GET',
              'http://www.example.com/api/v1/test',
              new Date().getTime(),
              {}
            );
            this.setState({result:"Clicked"} as MainScreenState);
            DdRum.stopResource('1', 200, 'xhr', new Date().getTime() + 200, {});
          }}
        />
      </View>
    }
}
