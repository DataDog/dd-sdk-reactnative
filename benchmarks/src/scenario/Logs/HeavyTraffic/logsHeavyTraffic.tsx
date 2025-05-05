/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React from 'react';
import { createStaticNavigation, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Text,
  Pressable
} from 'react-native';
import type { LogsHeavyTrafficScenarioProps } from "../types";
import ImageListScreen from './imageList';
import ConfigScreen from './config';
import { Colors } from '../../../common/styles';

function LogsHeavyTrafficScenario(props: LogsHeavyTrafficScenarioProps): React.JSX.Element {  
  function ConfigHeaderButton() {
    const navigation = useNavigation();

    return (
      <Pressable onPress={() => navigation.navigate('Config' as never)}>
        <Text style={{color: Colors.DatadogPurple}}>{"Config"}</Text>
      </Pressable>
    );
  }

  const ImageListWithProps = () => {
    return <ImageListScreen testConfig={props.testConfig}/>;
  };

  const RootStack = createNativeStackNavigator({
    initialRouteName: "ImageList",
    screenOptions: {
      headerTintColor: Colors.DatadogPurple,
      headerTitleAlign: 'left',
      headerTitleStyle: {
        fontSize: 22,
        fontWeight: 'bold',
      },
      headerRight: () => <ConfigHeaderButton/>
    },
    screens: {
      ImageList: {
        screen: ImageListWithProps,
        options: {
          title: "HeavyTraffic",
        }
      } ,
      Config: {
        screen: ConfigScreen,
        options: {
          title: '',
          headerLeft: undefined,
          headerRight: undefined,
        }
      }
    }
  });

  const Navigation = createStaticNavigation(RootStack);

  return (
    <Navigation/>
  )
}

export default LogsHeavyTrafficScenario;