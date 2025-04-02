/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { PrimaryButton } from "../../../components/common/PrimaryButton";
import { Colors } from "../../../constants/Colors";
import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";

const ButtonsScreen = () => {
  const [primaryButtonPressed, setPrimaryButtonPressed] = useState(false);
  const [touchableOpacityPressed, setTouchableOpacityPressed] = useState(false);
  const [touchableHighlightPressed, setTouchableHighlightPressed] =
    useState(false);
  const [touchableWithoutFeedbackPressed, setTouchableWithoutFeedbackPressed] =
    useState(false);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainerStyle}
    >
      {/* Button Component */}
      <PrimaryButton
        text="Press Button"
        style={[
          styles.button,
          { backgroundColor: Colors.strongCyan },
          primaryButtonPressed && styles.buttonPressed,
        ]}
        onPress={() => setPrimaryButtonPressed(!primaryButtonPressed)}
      />

      {/* TouchableOpacity Component */}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: Colors.darkViolet },
          touchableOpacityPressed && styles.buttonPressed,
        ]}
        onPress={() => setTouchableOpacityPressed(!touchableOpacityPressed)}
      >
        <Text style={styles.buttonText}>Press TouchableOpacity</Text>
      </TouchableOpacity>

      {/* TouchableHighlight Component */}
      <TouchableHighlight
        style={[
          styles.button,
          { backgroundColor: Colors.darkGreen },
          touchableHighlightPressed && styles.buttonPressed,
        ]}
        underlayColor="#DDDDDD"
        onPress={() => setTouchableHighlightPressed(!touchableHighlightPressed)}
      >
        <Text style={styles.buttonText}>Press TouchableHighlight</Text>
      </TouchableHighlight>

      {/* TouchableWithoutFeedback Component */}
      <TouchableWithoutFeedback
        onPress={() =>
          setTouchableWithoutFeedbackPressed(!touchableWithoutFeedbackPressed)
        }
      >
        <View
          style={[
            styles.button,
            { backgroundColor: Colors.deepPink },
            touchableWithoutFeedbackPressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Press TouchableWithoutFeedback</Text>
        </View>
      </TouchableWithoutFeedback>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    alignSelf: "center",
  },
  contentContainerStyle: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    rowGap: 16,
    padding: 24,
  },
  button: {
    backgroundColor: Colors.primaryColor,
    borderRadius: 5,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  buttonPressed: {
    backgroundColor: "#FF5722",
  },
});

export default ButtonsScreen;
