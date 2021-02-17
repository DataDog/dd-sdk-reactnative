import React, { Component } from 'react';
import { View, Text, Button, TouchableOpacity, TouchableWithoutFeedback, TouchableNativeFeedback } from 'react-native';
import styles from './styles';
import {
  DdRum
} from 'dd-sdk-reactnative';

interface MainScreenState {
  welcomeMessage: string
  resultButtonAction: string
  resultTouchableOpacityAction: string,
  resultTouchableWithoutFeedback: string,
  resultTouchableNativeFeedback: string
}

const RESOURCE_URL = "http://www.example.com/api/v1/test";

export default class MainScreen extends Component<any, MainScreenState> {

  constructor(props: Readonly<any> | undefined) {
    super(props);
    this.state = { welcomeMessage: "Welcome", resultButtonAction: "", resultTouchableOpacityAction: "" } as MainScreenState;
  }

  startRandomResource() {
    const randomUrl = `${RESOURCE_URL}/${Math.random()}`
    console.log("resource is started")
    DdRum.startResource(
      '1',
      'GET',
      randomUrl,
      new Date().getTime(),
      {}
    );

    DdRum.stopResource('1', 200, 'xhr', new Date().getTime(), {})
    // give time to send the action
  }
  render() {
    return <View style={styles.defaultScreen}>
      <Text>{this.state.welcomeMessage}</Text>
      <View style={{ marginTop: 40, alignItems: "center" }}>
        <Text>{this.state.resultButtonAction}</Text>
        <Button
          title="Click me"
          accessibilityLabel="ckick_me_button"
          onPress={() => {
            this.startRandomResource()
            this.setState({ resultButtonAction: "Button Clicked" } as MainScreenState);
          }}
        />
        <Text style={{ marginTop: 20 }}>{this.state.resultTouchableOpacityAction}</Text>
        <TouchableOpacity
          accessibilityLabel="click_me_touchableopacity"
          style={styles.button} onPress={() => {
            this.startRandomResource()
            this.setState({ resultTouchableOpacityAction: "TouchableOpacity Clicked" } as MainScreenState);
          }}
        >
          <Text>Click me</Text>
        </TouchableOpacity>
        <Text style={{ marginTop: 20 }}>{this.state.resultTouchableWithoutFeedback}</Text>
        <TouchableWithoutFeedback
          accessibilityLabel="click_me_touchablewithoutfeedback"
          onPress={() => {
            this.startRandomResource()
            this.setState({ resultTouchableWithoutFeedback: "TouchableWithoutFeedback Clicked" } as MainScreenState);
          }}>
          <View style={styles.button}>
            <Text>Click me</Text>
          </View>
        </TouchableWithoutFeedback>
        <Text style={{ marginTop: 20 }}>{this.state.resultTouchableNativeFeedback}</Text>
        <TouchableNativeFeedback
          accessibilityLabel="click_me_touchablenativefeedback"
          onPress={ () => { 
            undefinedMethod(); // called on purpose to trigger an error
          }}>
          <View style={styles.button}>
            <Text>Click me (error)</Text>
          </View>
        </TouchableNativeFeedback>
      </View>
    </View>
  }
}
