/* eslint-disable no-console */
/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { Navigation } from 'react-native-navigation';
import { AppRegistry } from 'react-native';

import { name as appName } from './app.json';
import App from './src/App';

AppRegistry.registerComponent(appName, () => App);

Navigation.events().registerAppLaunchedListener(() => {
    Navigation.setRoot({
        root: {
            stack: {
                options: {
                    topBar: {
                        visible: false
                    }
                },
                children: [
                    {
                        component: {
                            name: appName
                        }
                    }
                ]
            }
        }
    });
});