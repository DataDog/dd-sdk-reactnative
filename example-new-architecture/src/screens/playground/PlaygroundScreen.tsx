/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {PrimaryButton} from '../../components/common/PrimaryButton';
import {Colors} from '../../constants/Colors';
import Routes from '../../Routes';
import {useState} from 'react';
import {
  Modal,
  ScrollView,
  View,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

const PlaygroundScreen = ({navigation}: {navigation: any}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainerStyle}>
      <PrimaryButton
        text="Go to Colors"
        onPress={() => navigation.navigate(Routes.PLAYGROUND_COLORS.id)}
        style={[styles.scrollViewItem, {backgroundColor: Colors.darkViolet}]}
      />
      <PrimaryButton
        text="Go to Buttons"
        onPress={() => navigation.navigate(Routes.PLAYGROUND_BUTTONS.id)}
        style={[styles.scrollViewItem, {backgroundColor: Colors.darkOrange}]}
      />
      <PrimaryButton
        text="Go to Forms"
        onPress={() => navigation.navigate(Routes.FORMS.id)}
        style={[styles.scrollViewItem, {backgroundColor: Colors.deepBlue}]}
      />
      <PrimaryButton
        text="Go to Images"
        onPress={() => navigation.navigate(Routes.IMAGES.id)}
        style={[styles.scrollViewItem, {backgroundColor: Colors.darkRed}]}
      />
      <PrimaryButton
        text="Go to Drawer"
        onPress={() => navigation.navigate(Routes.DRAWER.id)}
        style={[styles.scrollViewItem, {backgroundColor: Colors.darkOrange}]}
      />
      <PrimaryButton
        text="Open Modal"
        onPress={() => setModalVisible(true)}
        style={[styles.scrollViewItem, {backgroundColor: Colors.deepPink}]}
      />

      {/* Modal Component */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>This is a modal!</Text>
            {/* First Name */}
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
            />

            {/* Last Name */}
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
            />
            <PrimaryButton
              text="Close Modal"
              onPress={() => setModalVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  contentContainerStyle: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    rowGap: 16,
    padding: 24,
  },
  scrollViewItem: {
    paddingVertical: 16,
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    flex: 1,
    flexDirection: 'column',
    margin: 32,
    padding: 24,
    backgroundColor: 'white',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalText: {
    padding: 16,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
});

export default PlaygroundScreen;
