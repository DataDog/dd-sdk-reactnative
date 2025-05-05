/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, { useEffect } from 'react';
import {
  Text,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigationExampleScenarioProps } from './types';
import { RunType } from '../../testSetup/types/testConfig';
import { instrument } from '../../testSetup/testUtils';

function NavigationExampleScenario(props: NavigationExampleScenarioProps): React.JSX.Element {
  useEffect(() => {
    if (props.testConfig?.runType !== RunType.BASELINE) {
      instrument();
    }
  }, []);

  function FirstTabScreen() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text> {'Navigation Example Scenario - First Tab'} </Text>
      </View>
    );
  }

  function SecondTabScreen() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text> {'Navigation Example Scenario - Second Tab'} </Text>
      </View>
    );
  }

  const Tabs = createBottomTabNavigator();

  return (
    <NavigationContainer>
        <Tabs.Navigator>
            <Tabs.Screen name="First" component={FirstTabScreen}/>
            <Tabs.Screen name="Second" component={SecondTabScreen}/>
        </Tabs.Navigator>
    </NavigationContainer>
  )
}

export default NavigationExampleScenario;
