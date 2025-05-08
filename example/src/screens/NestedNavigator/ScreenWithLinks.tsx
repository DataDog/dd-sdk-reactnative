import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Button } from 'react-native';
import React from 'react';

import type {
    StackNavigation,
    ScreenNames,
    NestedStackParamList
} from '../../NavigationRoot';

type Props =
    | NativeStackScreenProps<NestedStackParamList, 'ScreenWithLinks'>
    | NativeStackScreenProps<NestedStackParamList, 'Screen1'>
    | NativeStackScreenProps<NestedStackParamList, 'Screen2'>;

export const ScreenWithLinks: React.FC<Props> = ({ route }) => {
    const navigation = useNavigation<StackNavigation>();
    return (
        <>
            {route.params.links.map(link => (
                <Button
                    title={`go to ${link.routeName}`}
                    onPress={() =>
                        navigation.navigate(
                            link.routeName as ScreenNames[number]
                        )
                    }
                    key={link.routeName}
                />
            ))}
        </>
    );
};
