import type { TextStyle, StyleProp } from 'react-native';
import { Text, TouchableOpacity } from 'react-native';
import React, { Component } from 'react';

import styles from './styles';

interface ConsentItemProps {
    item: string;
    textColor: StyleProp<TextStyle>;
    backgroundColor: StyleProp<TextStyle>;
    onPress: () => void;
}

export default class ConsentItem extends Component<ConsentItemProps, any> {
    render() {
        return (
            <TouchableOpacity
                onPress={this.props.onPress}
                style={[styles.item, this.props.backgroundColor]}
            >
                <Text style={[styles.itemTitle, this.props.textColor]}>
                    {this.props.item}
                </Text>
            </TouchableOpacity>
        );
    }
}
