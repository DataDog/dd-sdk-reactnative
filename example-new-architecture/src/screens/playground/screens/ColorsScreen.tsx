/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";

const COLORS = [
  "#FF5733",
  "#33FF57",
  "#5733FF",
  "#FF33A1",
  "#33FFF9",
  "#F9FF33",
  "#33F9FF",
  "#FF33F9",
  "#ECF975",
  "#33FF33",
  "#FF3333",
  "#3333FF",
  "#33FFA1",
  "#FFA133",
  "#A1FF33",
  "#A133FF",
  "#33A1FF",
  "#FF33A1",
  "#EEFBAC",
  "#FF33A1",

  // Different alpha levels
  "#00008Ccc",
  "#00008C99",
  "#00008C66",
  "#00008C44",
];

const ColorSquare = ({ color }: { color: string }) => {
  return (
    <View style={styles.squareContainer}>
      <View style={[styles.square, { backgroundColor: color }]} />
      <Text style={styles.colorText}>{color}</Text>
    </View>
  );
};

const ColorsScreen = () => {
  return (
    <FlatList
      data={COLORS}
      keyExtractor={(item) => item}
      numColumns={4} // 4 squares per row
      renderItem={({ item }) => <ColorSquare color={item} />}
      contentContainerStyle={styles.gridContainer}
    />
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    padding: 10,
  },
  squareContainer: {
    flex: 1,
    alignItems: "center",
    margin: 5, // Adjusted margin to fit 4 squares per row
  },
  square: {
    width: 70, // Reduced size to fit 4 per row
    height: 70, // Reduced size to fit 4 per row
  },
  colorText: {
    marginTop: 5,
    fontSize: 12, // Reduced font size to fit better with smaller squares
    color: "#000",
  },
});

export default ColorsScreen;
