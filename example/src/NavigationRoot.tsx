import type {
    NavigationContainerRef,
    NavigationProp
} from '@react-navigation/native';
import * as React from 'react';

export type ScreenNames = ['Home', 'Error', 'About', 'Nested'];
export type NestedScreenNames = ['Screen1', 'Screen2', 'About'];

export type RootStackParamList = Record<ScreenNames[number], undefined>;

type LinksType = { links: { routeName: string }[] };
export type NestedStackParamList = {
    ScreenWithLinks: LinksType;
    Screen1: LinksType;
    Screen2: LinksType;
    About: undefined;
};

export type StackNavigation = NavigationProp<RootStackParamList>;
export type NestedStackNavigation = NavigationProp<NestedStackParamList>;

export const navigationRef: React.RefObject<NavigationContainerRef<object> | null> =
    React.createRef();
