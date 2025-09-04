import {
  SafeAreaView,
  ScrollView,
  Pressable,
  Text,
} from 'react-native';
import React from 'react';
import { useNavigation } from '@react-navigation/native';

import { CommonStyles as styles } from '../../common/styles';
import { UIElement } from './types';

function UICatalogMenu(): React.JSX.Element {
    const navigation = useNavigation();

    const goToDetail = (component: string) => {
        navigation.navigate('UIDetailView' as unknown as never, {component} as unknown as never);
    };

    return (
        <SafeAreaView style={styles.uiItemsContainer}>
            <ScrollView>
                {Object.values(UIElement).map((entry: string, index: number) => (
                    <Pressable 
                        key={index} 
                        onPress={() => goToDetail(entry)}
                        style={styles.uiElementCell} 
                    >
                        <Text style={styles.uiElementTitle}>{entry}</Text>
                        <Text style={styles.uiElementArrow}>{">"}</Text>
                    </Pressable>
                ))}
            </ScrollView>
        </SafeAreaView>
    )
};

export default UICatalogMenu;
