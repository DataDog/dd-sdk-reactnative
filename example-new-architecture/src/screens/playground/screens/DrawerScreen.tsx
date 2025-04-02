/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { PrimaryButton } from "../../../components/common/PrimaryButton";
import TrieInfoContent from "../../../components/common/TrieInfoContent";
import React from "react";
import { Text, Button, StyleSheet, View } from "react-native";
import { Drawer } from "react-native-drawer-layout";

const DrawerScreen = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Drawer
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      renderDrawerContent={() => {
        return (
          <View style={styles.drawerContainer}>
            <Text style={styles.drawerTitle}>
              You can play with these buttons:
            </Text>
            <PrimaryButton style={styles.drawerButton} text="Button 1" />
            <PrimaryButton style={styles.drawerButton} text="Button 2" />
            <PrimaryButton style={styles.drawerButton} text="Button 3" />
            <PrimaryButton style={styles.drawerButton} text="Button 4" />
            <PrimaryButton style={styles.drawerButton} text="Button 5" />
          </View>
        );
      }}
    >
      <Button
        onPress={() => setOpen((prevOpen) => !prevOpen)}
        title={`${open ? "Close" : "Open"} drawer`}
      />

      <TrieInfoContent />
    </Drawer>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    rowGap: 16,
    padding: 16,
  },
  drawerTitle: {
    fontWeight: "bold",
  },
  drawerButton: {
    width: "100%",
    paddingVertical: 16,
  },
});

export default DrawerScreen;
