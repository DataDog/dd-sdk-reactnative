/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, {useState} from 'react';
import {Platform, Pressable, Text } from 'react-native';
import {Picker as RNPicker, PickerIOS as RNPickerIOS} from '@react-native-picker/picker';
import type {PickerProps} from './types';
import styles from './styles';

const isIOS = Platform.OS === 'ios';

function Picker(props: PickerProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  const openPicker = () => {
    setIsOpen(true);
  };

  const onValueChange = (newValue: unknown) => {
    setIsOpen(false);
    props?.onValueChange(newValue);
  };

   if (isIOS) {
    if (isOpen) {
      return (
          <RNPickerIOS  
              style={styles.picker}
              selectedValue={props.label}
              onValueChange={onValueChange}
              numberOfLines={1}
          >
              {props.values.map(({label, value}, index) => (
                <RNPickerIOS.Item key={`${props.label}_picker_${index}`} label={label} value={value} />
              ))}
          </RNPickerIOS>
      )
    } else {
        return (
          <Pressable style={styles.pickerButton} onPress={openPicker}>
            <Text style={styles.pickerLabel}>{props.label.toUpperCase()}</Text>
          </Pressable>
        )
    }
  } else {
    return (
        <RNPicker
            mode="dropdown"
            style={styles.picker}
            selectedValue={props.label}
            onValueChange={onValueChange}
          >
            {props.values.map(({label, value}, index) => (
              <RNPicker.Item key={`${props.label}_picker_${index}`} label={label} value={value} />
            ))}
        </RNPicker>
    )
  };
}

export default Picker;
