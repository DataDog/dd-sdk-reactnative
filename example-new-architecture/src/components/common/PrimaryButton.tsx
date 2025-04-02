/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React from 'react';
import {
  StyleSheet,
  StyleProp,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import {Colors} from '../../constants/Colors';

type Props = {
  text: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export const PrimaryButton = ({text, onPress, style}: Props) => {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Text style={styles.text}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primaryColor,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: 'white',
  },
});
