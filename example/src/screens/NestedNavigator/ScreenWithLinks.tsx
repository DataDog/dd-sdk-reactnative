import React from 'react';
import {Button} from 'react-native';
import {useNavigation} from '@react-navigation/native'

export const ScreenWithLinks = (props: {links: { routeName: string}[]}) => {
    const {navigate} = useNavigation()
    return (<>
    {props.links.map(link => <Button title={`go to ${link.routeName}`} onPress={() => navigate(link.routeName)} key={link.routeName} />)}
    </>)
}