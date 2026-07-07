import {
  View,
  SafeAreaView,
  Text,
} from 'react-native';
import React, { useEffect } from 'react';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import type { SessionReplayStackParamList } from './types';
import { CommonStyles as styles } from '../../common/styles';
import { UIElement } from './types';
import Picker from './component/Picker';
import Buttons from './component/Buttons';
import Images from './component/Images';
import TextViews from './component/TextViews';
import Views from './component/Views';
import TextInputs from './component/TextInputs';
import ActivityIndicators from './component/ActivityIndicators';
import Switches from './component/Swtiches';
import Webview from './component/WebView';
import Sliders from './component/Sliders';
import SectionList from './component/SectionList';
import Modal from './component/Modal';
import SvgTestCases from './component/Svg';

type UIDetailViewRouteProp = RouteProp<SessionReplayStackParamList, 'UIDetailView'>;

function UIDetailView(): React.JSX.Element {
    const navigation = useNavigation();
    const route = useRoute<UIDetailViewRouteProp>();
    const component = route.params?.component;

    useEffect(() => {
        navigation.setOptions({ headerBackTitle: 'Back', headerTitle: component });
    }, []);

    const renderUIElement = (component?: string) => {
        switch(component) {
            case UIElement.Views:
                return <Views/>;
            case UIElement.Images:
                return <Images/>
            case UIElement.TextViews:
                return <TextViews/>;
            case UIElement.TextInputs:
                return <TextInputs/>;
            case UIElement.Switches:
                return <Switches/>;
            case UIElement.Buttons:
                return <Buttons/>;
            case UIElement.Picker:
                return  <Picker/>
            case UIElement.Sliders:
                return <Sliders/>;
            case UIElement.ActivityIndicators:
                return <ActivityIndicators/>;
            case UIElement.WebView:
                return <Webview/>;
            case UIElement.SectionList:
                return <SectionList/>;
            case UIElement.Modal:
                return <Modal/>;
            case UIElement.Svg:
                return <SvgTestCases/>;
            default:
                return (
                    <View style={styles.fullScreenHolder}>
                        <Text>Unknown UIElement :/</Text>
                    </View>
                );
        }
    }

    return (
        <SafeAreaView style={styles.uiItemsContainer}>
            {renderUIElement(component)}
        </SafeAreaView>
    )
};

export default UIDetailView;
