/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
 
import React, { Component } from 'react';
import { View, Text, Button, TouchableOpacity, TouchableWithoutFeedback, TouchableNativeFeedback } from 'react-native';
import styles from './styles';
import {
  DdRum
} from 'dd-sdk-reactnative';


const axios = require('../axiosConfig');

interface MainScreenState {
  welcomeMessage: string
  resultButtonAction: string
  resultTouchableOpacityAction: string,
  resultTouchableWithoutFeedback: string,
  resultTouchableNativeFeedback: string
}

export default class MainScreen extends Component<any, MainScreenState> {

  constructor(props: Readonly<any> | undefined) {
    super(props);
    this.state = { welcomeMessage: "Welcome", resultButtonAction: "", resultTouchableOpacityAction: "" } as MainScreenState;
  }

  fetchUser () {
     return fetch('https://random-data-api.com/api/users/random_user')
         .then((response) => response.json())
  };

  xhrRestaurant () {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      // URL will generate a 404 error ;)
      xhr.open("GET", "https://random-data-api.com/api/restaurant/random_3restaurant");
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function () {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send();
    });
  }

  axiosVehicle () {
    return axios.request({ method: 'get', url: '/api/vehicle/random_vehicle'})
        .then((response) => response.data);
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
            this.fetchUser().then ((json) => {
              const msg = "Fetched User:" + json.username
              this.setState({ resultButtonAction: msg } as MainScreenState);  
              console.log("Fetched user:" + json.email)
            }).catch(function (error) {
              this.setState({ resultButtonAction: "Unable to load user" } as MainScreenState);
              console.log(error);
            });
          }}
        />
        <Text style={{ marginTop: 20 }}>{this.state.resultTouchableOpacityAction}</Text>
        <TouchableOpacity
          accessibilityLabel="click_me_touchableopacity"
          style={styles.button} onPress={() => {
            this.xhrRestaurant().then ((json) => {
              const msg = "Fetched restaurant:" + json.name
              this.setState({ resultTouchableOpacityAction: msg } as MainScreenState);  
              console.log("Fetched restaurant:" + json.name)
            }).catch(function (error) {
              //this.setState({ resultButtonAction: "Unable to load restaurant" } as MainScreenState);
              console.log(error);
            });
          }}
        >
          <Text>Click me</Text>
        </TouchableOpacity>
        <Text style={{ marginTop: 20 }}>{this.state.resultTouchableWithoutFeedback}</Text>
        <TouchableWithoutFeedback
          accessibilityLabel="click_me_touchablewithoutfeedback"
          onPress={() => {
            this.axiosVehicle().then ((json) => {
              const msg = "Fetched vehicle:" + json.make_and_model
              this.setState({ resultTouchableWithoutFeedback: msg } as MainScreenState);  
              console.log("Fetched vehicle:" + json.license_plate)
            }).catch(function (error) {
              // this.setState({ resultButtonAction: "Unable to load vehicle" } as MainScreenState);
              console.log(error);
            });
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
