/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Button,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Routes from "@/src/Routes";

const FormsScreen = ({ navigation }: { navigation: any }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState(new Date());
  const [gender, setGender] = useState("male");
  const [isSelected, setSelection] = useState(false);
  const [hobbies, setHobbies] = useState({
    reading: false,
    music: false,
    sports: false,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [country, setCountry] = useState("us"); // Default to United States
  const [modalVisible, setModalVisible] = useState(false);

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     console.log("** navigation **");
  //     navigation.navigate(Routes.FORMS.id);
  //   }, 5000);
  //
  //   return () => clearInterval(interval);
  // }, [navigation]);

  const onChangeDate = (event: any, selectedDate: any) => {
    const currentDate = selectedDate || birthDate;
    setShowDatePicker(false);
    setBirthDate(currentDate);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.title}>Give us your data</Text>
      <Text style={styles.subtitle}>(we need it more than you do)</Text>

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

      {/* Phone Number */}
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />

      {/* Email */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      {/* Password */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {/* Date of Birth */}
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={styles.dateButton}
      >
        <Text style={styles.dateText}>
          Birth Date: {birthDate.toDateString()}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={birthDate}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}

      {/* Gender (Radio Buttons) */}
      <Text style={styles.label}>Gender</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity
          style={styles.radioButton}
          onPress={() => setGender("male")}
        >
          <View
            style={
              gender === "male" ? styles.radioSelected : styles.radioUnselected
            }
          />
          <Text>Male</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.radioButton}
          onPress={() => setGender("female")}
        >
          <View
            style={
              gender === "female"
                ? styles.radioSelected
                : styles.radioUnselected
            }
          />
          <Text>Female</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.radioButton}
          onPress={() => setGender("other")}
        >
          <View
            style={
              gender === "other" ? styles.radioSelected : styles.radioUnselected
            }
          />
          <Text>Other</Text>
        </TouchableOpacity>
      </View>

      {/* Multi-checkboxes for hobbies */}
      <Text style={styles.label}>Hobbies</Text>
      <View style={styles.checkboxGroup}>
        <View style={styles.checkboxContainer}>
          <Switch
            value={hobbies.reading}
            onValueChange={() =>
              setHobbies({ ...hobbies, reading: !hobbies.reading })
            }
          />
          <Text style={styles.label}>Reading</Text>
        </View>
        <View style={styles.checkboxContainer}>
          <Switch
            value={hobbies.music}
            onValueChange={() =>
              setHobbies({ ...hobbies, music: !hobbies.music })
            }
          />
          <Text style={styles.label}>Music</Text>
        </View>
        <View style={styles.checkboxContainer}>
          <Switch
            value={hobbies.sports}
            onValueChange={() =>
              setHobbies({ ...hobbies, sports: !hobbies.sports })
            }
          />
          <Text style={styles.label}>Sports</Text>
        </View>
      </View>

      {/* Country Selection */}
      <Text style={styles.label}>Country</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setModalVisible(true)}
      >
        <Text>
          {country === "us"
            ? "United States"
            : country === "ca"
              ? "Canada"
              : country === "uk"
                ? "United Kingdom"
                : "Australia"}
        </Text>
      </TouchableOpacity>

      {/* Checkbox */}
      <View style={styles.checkboxContainer}>
        <Switch value={isSelected} onValueChange={setSelection} />
        <View style={styles.labelsContainer}>
          <Text style={styles.label}>I agree to the terms and conditions</Text>
          <Text style={styles.smallLabel}>
            I understand that my data and soul will be taken, used, sold and
            consumed.
          </Text>
        </View>
      </View>

      {/* Modal for Country Options */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.label}>Select Country</Text>

            <TouchableOpacity
              onPress={() => {
                setCountry("us");
                setModalVisible(false);
              }}
              style={styles.modalItem}
            >
              <Text>United States</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setCountry("ca");
                setModalVisible(false);
              }}
              style={styles.modalItem}
            >
              <Text>Canada</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setCountry("uk");
                setModalVisible(false);
              }}
              style={styles.modalItem}
            >
              <Text>United Kingdom</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setCountry("au");
                setModalVisible(false);
              }}
              style={styles.modalItem}
            >
              <Text>Australia</Text>
            </TouchableOpacity>

            {/* Close Modal */}
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Submit Button */}
      <Button title="Submit" onPress={() => console.log("Form Submitted")} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 64,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "red",
    borderColor: "blue",
    borderWidth: 1,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    padding: 10,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "normal",
    marginTop: 8,
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: "#ddd",
    borderWidth: 1,
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  dateButton: {
    padding: 15,
    backgroundColor: "#ddd",
    borderRadius: 5,
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
  },
  labelsContainer: {
    flexDirection: "column",
  },
  label: {
    fontSize: 16,
  },
  smallLabel: {
    fontSize: 8,
    marginBottom: 5,
  },
  radioGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 16,
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  radioSelected: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "#000",
    marginRight: 5,
  },
  radioUnselected: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#000",
    marginRight: 5,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    columnGap: 8,
  },
  checkboxGroup: {
    marginBottom: 16,
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
});

export default FormsScreen;
