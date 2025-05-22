/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, { useEffect } from 'react';
import type { LogsHeavyTrafficScenarioProps } from "./types";
import {
  View,
} from 'react-native';
import { RunType } from "../../testSetup/types/testConfig";
import { instrument } from "../../testSetup/testUtils";

function LogsHeavyTrafficScenario(props: LogsHeavyTrafficScenarioProps): React.JSX.Element {

 useEffect(() => {
    console.log("Loaded Logs Heavy Traffic Scenario")

    if (props.testConfig?.runType !== RunType.BASELINE) {
      instrument(props.testConfig);
    }

  }, []);

  return (
    <View></View>
  )
}

export default LogsHeavyTrafficScenario;