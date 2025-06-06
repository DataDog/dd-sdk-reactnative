/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, { useEffect, useState } from 'react';
import {
  Linking,
  Text,
  View,
} from 'react-native';
import { DEFAULT_ENV_TEST_CONFIG, getDatadogConfig, getTestConfigFromDeeplink, isValidScenario, startCollectingVitals, stopCollectingVitals } from './testSetup/testUtils';
import { Command, Scenario } from './testSetup/types/testConfig';
import type { TestConfig } from './testSetup/types/testConfig';
import DefaultScenario from './scenario/Default/defaultScenario';
import NavigationExampleScenario from './scenario/NavigationExample/navigationExampleScenario';
import LogsCustomScenario from './scenario/Logs/Custom/logsCustomScenario';
import LogsHeavyTrafficScenario from './scenario/Logs/HeavyTraffic/logsHeavyTraffic';
import TracesScenario from './scenario/Traces/tracesScenario';

function App(): React.JSX.Element {
  const [testConfig, setTestConfig] = useState<TestConfig | undefined>();

  useEffect(() => {
    setupFromTestConfig(DEFAULT_ENV_TEST_CONFIG);

    Linking.getInitialURL().then(url => {
      setupFromUrl(url);
    });

    const deeplinkListener = Linking.addEventListener('url', ({ url }) => {
        setupFromUrl(url);
    })

    return () => {
      deeplinkListener.remove();
    }
  }, []);

  const setupFromTestConfig = async (testConfig: TestConfig | undefined) => {
    switch (testConfig?.command) {
      case Command.Start: 
        if (isValidScenario(testConfig?.scenario)) {
          const datadogConfig = getDatadogConfig();
          testConfig.datadogConfig = datadogConfig;

          await startCollectingVitals(testConfig, datadogConfig);

          // Starts running the Scenario
          setTestConfig(testConfig);
        }
        break;
      case Command.Stop:
        setTestConfig(undefined);
        await stopCollectingVitals();
        break;
    }
  }

  const setupFromUrl = (url: string | null | undefined) => {
    if (url) {
      const newTestConfig = getTestConfigFromDeeplink(url);
      setupFromTestConfig(newTestConfig);
    }
  }

  switch(testConfig?.scenario) {
    case Scenario.Default:
      return <DefaultScenario testConfig={testConfig}/>;
    case Scenario.NavigationExample:
      return <NavigationExampleScenario testConfig={testConfig}/>;
    case Scenario.LogsCustom:
      return <LogsCustomScenario testConfig={testConfig}/>;
    case Scenario.LogsHeavyTraffic:
      return <LogsHeavyTrafficScenario testConfig={testConfig}/>;
    case Scenario.Traces:
      return <TracesScenario testConfig={testConfig}/>
    // Add new scenarios here
    default:
      return (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <Text>No scenario loaded</Text>
        </View>
      );
  }
}

export default App;
