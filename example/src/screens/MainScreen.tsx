/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, { Component, RefObject } from 'react';
import {
  View, Text, Button, TouchableOpacity,
  TouchableWithoutFeedback, TouchableNativeFeedback, ActivityIndicator
} from 'react-native';
import { DdLogs, DdSdkReactNative, TrackingConsent, DdFlags } from '@datadog/mobile-react-native';
import { FeatureFlag } from '@openfeature/react-sdk';
import styles from './styles';
import { FlagsSourceToggle } from '../components/FlagsSourceToggle';
import { APPLICATION_KEY, API_KEY } from '../../src/ddCredentials';
import { getTrackingConsent, saveTrackingConsent } from '../utils';
import { ConsentModal } from '../components/consent';

const axios = require('../axiosConfig');

interface MainScreenState {
  welcomeMessage: string
  callDatadogButtonAction: string
  resultButtonAction: string
  resultTouchableOpacityAction: string,
  resultTouchableWithoutFeedback: string,
  resultTouchableNativeFeedback: string,
  trackingConsent: TrackingConsent,
  trackingConsentModalVisible: boolean
}

export default class MainScreen extends Component<any, MainScreenState> {

  consentModal: RefObject<ConsentModal>;

  constructor(props: Readonly<any> | undefined) {
    super(props);
    this.state = {
      welcomeMessage: "Welcome",
      resultButtonAction: "",
      resultTouchableOpacityAction: "",
      trackingConsent: TrackingConsent.PENDING,
      trackingConsentModalVisible: false
    } as MainScreenState;
    this.consentModal = React.createRef()
  }

  fetchDatadogLogs() {
    return fetch('https://api.datadoghq.com/api/v2/logs/events', {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': API_KEY,
        'DD-APPLICATION-KEY': APPLICATION_KEY
      }
    }).then((response) => response.json())
  }

  fetchUser() {
    return fetch('https://random-data-api.com/api/users/random_user')
      .then((response) => response.json())
  };

  xhrRestaurant() {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      // URL will generate a 404 error ;)
      xhr.open("GET", "https://random-data-api.com/api/restaurant/random_restaurant");
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
      console.log("aborting !")
      xhr.abort();
    });
  }

  axiosVehicle() {
    return axios.request({ method: 'get', url: '/api/vehicle/random_vehicle' })
      .then((response) => response.data);
  }

  componentDidMount() {
    this.updateTrackingConsent()
    DdLogs.debug("[DATADOG SDK] Test React Native Debug Log");
  }

  updateTrackingConsent() {
    getTrackingConsent().then(consent => {
      this.setState({
        trackingConsent: consent
      })
    })
  }

  setTrackingConsentModalVisible(visible: boolean) {
    if (visible) {
      this.consentModal.current.setConsent(this.state.trackingConsent)
    }
    this.setState({ trackingConsentModalVisible: visible })
  }

  render() {
    return <View style={styles.defaultScreen}>
      <FlagsSourceToggle initialSource="offline" />

      <FeatureFlag flagKey="rn-sdk-test-boolean-flag" defaultValue={false} fallback={<Text>Welcome!</Text>}>
        <Text>Greetings from the Feature Flags!</Text>
      </FeatureFlag>

      <Text style={{ marginTop: 10, textAlign: 'center' }}>The above greeting is being controlled by the{'\n'}`rn-sdk-test-boolean-flag` feature flag,{'\n'}resolved from the source selected above.</Text>

      <View style={{ marginTop: 40, alignItems: "center" }}>
        <Button
          title={`Tracking Consent: ${this.state.trackingConsent}`}
          accessibilityLabel="update_tracking_consent"
          onPress={() => this.setTrackingConsentModalVisible(true)}
        />
        <ConsentModal
          visible={this.state.trackingConsentModalVisible}
          ref={this.consentModal}
          onClose={
            (consent) => {
              saveTrackingConsent(consent)
              DdSdkReactNative.setTrackingConsent(consent)
              this.setState({ trackingConsent: consent })
              this.setTrackingConsentModalVisible(false)
            }
          } />
        <Text style={{ marginTop: 20 }}>{this.state.callDatadogButtonAction}</Text>
        <Button
          title="Fetch Datadog Logs"
          accessibilityLabel="call_datadog_button"
          onPress={() => {
            this.fetchDatadogLogs().then((response) => {
              console.log(response)
              this.setState({ callDatadogButtonAction: "Datadog logs retrieved" } as MainScreenState);
            }).catch(function (error) {
              this.setState({ callDatadogButtonAction: "Unable to call Datadog" } as MainScreenState);
              console.log(error);
            });
          }}
        />
        <Text style={{ marginTop: 20 }}>{this.state.resultButtonAction}</Text>
        <Button
          title="Click me"
          dd-action-name="click_me_button"
          onPress={() => {
            this.fetchUser().then((json) => {
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
          style={styles.button}
          onPress={() => {
            this.xhrRestaurant().then((json) => {
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
            this.axiosVehicle().then((json) => {
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
          onPress={() => {
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
