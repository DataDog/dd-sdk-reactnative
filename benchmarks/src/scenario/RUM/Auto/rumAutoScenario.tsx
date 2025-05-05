/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as React from 'react';
import { Platform } from 'react-native';
import { useNavigationContainerRef } from '@react-navigation/native';
import { DatadogProvider } from "@datadog/mobile-react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { DdRumReactNavigationTracking, type ViewNamePredicate } from '@datadog/mobile-react-navigation';
import type { Route } from "@react-navigation/native";
import { RunType } from '../../../testSetup/types/testConfig';
import { getDatadogProviderConfig } from '../../../testSetup/testUtils';
import type { RUMAutoScenarioProps, RootStackParamList } from './types';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CharactersScreen from './screens/characters';
import LocationsScreen from './screens/locations';
import EpisodesScreen from './screens/episodes';
import DocsScreen from './screens/docs';
import CharacterDetailScreen from './screens/characterDetail';
import EpisodeDetailScreen from './screens/episodeDetail';
import LocationDetailScreen from './screens/locationDetail';

function RUMAutoScenario(props: RUMAutoScenarioProps): React.JSX.Element {
    const instrumented = props.testConfig?.runType !== RunType.BASELINE;
    const navigationRef = useNavigationContainerRef();
    const viewNamePredicate: ViewNamePredicate = function customViewNamePredicate(route: Route<string, any | undefined>, trackedName: string) {
        return `RN ${Platform.OS} Benchmark - RUM Auto - ${trackedName} / ${route.name}`;
    };

    const onDatadogInitialization = () => {
        console.info("Datadog SDK initialized");
    };

    const Tab = createBottomTabNavigator();
    const RootStack = createNativeStackNavigator<RootStackParamList>();

    function TabNavigatior() {
        return (
            <Tab.Navigator 
                screenOptions={({
                    headerTitleAlign: 'left',
                    headerTitleStyle: {
                        fontSize: 25,
                        fontWeight: 'bold',
                    },
            })}>
                <Tab.Screen name="Characters" component={CharactersScreen}/>
                <Tab.Screen name="Locations" component={LocationsScreen}/>
                <Tab.Screen name="Episodes" component={EpisodesScreen}/>
                <Tab.Screen name="Docs" component={DocsScreen}/>
            </Tab.Navigator>
        )
    }

    function renderApp() {
        return (
            <NavigationContainer ref={navigationRef} onReady={() => {
                if (instrumented) {
                    DdRumReactNavigationTracking.startTrackingViews(navigationRef.current, viewNamePredicate);
                };
            }}>
                <RootStack.Navigator>
                    <RootStack.Screen
                        name='Tabs'
                        component={TabNavigatior}
                        options={{ headerShown: false }}
                    />
                    <RootStack.Screen name="CharacterDetail" component={CharacterDetailScreen} />
                    <RootStack.Screen name="LocationDetail" component={LocationDetailScreen} />
                    <RootStack.Screen name="EpisodeDetail" component={EpisodeDetailScreen}/>
                </RootStack.Navigator>
            </NavigationContainer>
        )
    };

    if (instrumented) {
        return (
            <DatadogProvider configuration={getDatadogProviderConfig()} onInitialization={onDatadogInitialization}>
                {renderApp()}
            </DatadogProvider>
        )
    } else {
        return renderApp();
    };   
}

export default RUMAutoScenario;