/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, {useState} from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  Text,
  StyleSheet,
} from 'react-native';
import {AccentButton} from './AccentButton';

type Props = {
  title?: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: {label: string; value: string}[];
};

const Dropdown = ({title, selectedValue, onValueChange, options}: Props) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (itemValue: string) => {
    onValueChange(itemValue);
    setModalVisible(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setModalVisible(true)}>
        <Text style={styles.dropdownText}>{selectedValue}</Text>
      </TouchableOpacity>
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{title}</Text>
            <FlatList
              data={options}
              keyExtractor={item => item.value}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleSelect(item.value)}>
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <AccentButton
              style={styles.modalButton}
              text="Close"
              onPress={() => setModalVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownButton: {
    padding: 16,
    backgroundColor: '#d2d2d2',
    borderRadius: 5,
    marginBottom: 10,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    rowGap: 16,
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  modalItemText: {
    fontSize: 16,
  },
  modalButton: {
    width: '100%',
    marginTop: 16,
  },
});

export default Dropdown;
