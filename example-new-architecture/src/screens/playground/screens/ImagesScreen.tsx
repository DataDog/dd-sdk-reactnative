/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, { useState } from "react";
import { View, Text, ScrollView, Image, StyleSheet } from "react-native";

const localImage = require("../../../../assets/images/datadog-logo-small.png");

const ImagesScreen = () => {
  const [, setRemoteImageLoaded] = useState(false);

  return (
    <ScrollView style={styles.container}>
      {/* Local Image */}
      <View style={styles.imageSection}>
        <Text style={styles.header}>Local</Text>
        <View style={styles.imageWrapper}>
          <Image
            source={localImage}
            style={styles.image}
            resizeMode="contain"
            onError={() => console.log("Error loading local image")}
          />
        </View>
      </View>

      {/* Remote Image */}
      <View style={styles.imageSection}>
        <Text style={styles.header}>Remote</Text>
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: "https://via.placeholder.com/100.png" }}
            style={styles.image}
            resizeMode="contain"
            onLoad={() => setRemoteImageLoaded(true)}
            onError={() => setRemoteImageLoaded(false)}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  imageSection: {
    marginBottom: 30,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  imageWrapper: {
    justifyContent: "center",
    alignItems: "center",
    height: 100, // Fixed height for image wrapper
    borderRadius: 10,
    overflow: "hidden",
  },
  image: {
    width: 100, // Fixed size for the image
    height: 100,
    resizeMode: "cover",
  },
  placeholder: {
    width: "100%",
  },
  placeholderText: {
    fontSize: 16,
    color: "red",
  },
});

export default ImagesScreen;
