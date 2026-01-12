import React, {useEffect, useState} from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStaticNavigation } from '@react-navigation/native';
import { ImagePrivacyLevel, SessionReplay, TextAndInputPrivacyLevel, TouchPrivacyLevel } from "@datadog/mobile-react-native-session-replay";

import type { SessionReplayScenarioProps } from "./types";
import { Colors, CommonStyles as styles } from '../../common/styles';
import { RunType } from '../../testSetup/types/testConfig';
import { instrument } from '../../testSetup/testUtils';
import UICatalogMenu from './UICatalogMenu';
import UIDetailView from './UIDetailView';
import { ActivityIndicator, SafeAreaView, View } from 'react-native';

function SessionReplayScenario(props: SessionReplayScenarioProps): React.JSX.Element {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (props.testConfig?.runType !== RunType.BASELINE) {
            instrument().then(() => {
                SessionReplay.enable({
                    replaySampleRate: 100,
                    textAndInputPrivacyLevel: TextAndInputPrivacyLevel.MASK_SENSITIVE_INPUTS,
                    imagePrivacyLevel: ImagePrivacyLevel.MASK_NONE,
                    touchPrivacyLevel: TouchPrivacyLevel.SHOW,
                }).then(() => {
                    setIsReady(true);
                    console.log("Session replay - start recording");
                });
            });
        } else {
            setIsReady(true);
        }
    }, []);

    if (isReady) { 
        const RootStack = createNativeStackNavigator({
            initialRouteName: "UICatalogMenu",
            headerTintColor: Colors.DatadogPurple,
            headerTitleAlign: 'left',
            headerTitleStyle: {
                fontSize: 22,
                fontWeight: 'bold',
            },
            screens: {
                UICatalogMenu: {
                    screen: UICatalogMenu,
                },
                UIDetailView: {
                    screen: UIDetailView,
                }
            }
        });

        const Navigation = createStaticNavigation(RootStack);

        return (
            <Navigation/>
        );
    } else {
        return (
            <SafeAreaView style={styles.safeAreaContainer}>
                <View style={styles.fullScreenHolder}>
                    <ActivityIndicator size={"large"}/>
                </View>
            </SafeAreaView>
        );
    };
}

export default SessionReplayScenario
