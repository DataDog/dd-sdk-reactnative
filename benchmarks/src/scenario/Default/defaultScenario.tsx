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
import type { DefaultScenarioProps } from './types';
import { RunType } from '../../testSetup/types/testConfig';
import { instrument } from '../../testSetup/testUtils';

function DefaultScenario(props: DefaultScenarioProps): React.JSX.Element {
  useEffect(() => {
    if (props.testConfig?.runType !== RunType.BASELINE) {
      instrument();
    }
  }, []);

  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
      <Text> {'Default Scenario'} </Text>
    </View>
  );
}

export default DefaultScenario;
