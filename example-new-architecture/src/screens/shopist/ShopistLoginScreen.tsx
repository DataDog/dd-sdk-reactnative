/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Routes from "../../Routes";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
} from "react-native";

export default function ShopistLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigation = useNavigation<any>();

  const handleLogin = () => {
    if (password === "1234") {
      navigation.navigate(Routes.SHOPIST_CATEGORIES.id);
      setError("");
      setEmail("");
      setPassword("");
    } else {
      setError("Incorrect username or password");
    }
  };

  return (
    <View style={styles.container}>
      <Image
        style={styles.image}
        source={require("../../../assets/images/shopping-cart.png")}
      />
      <View style={styles.inputView}>
        <TextInput
          style={styles.TextInput}
          value={email}
          placeholder="Email."
          placeholderTextColor="#003f5c"
          onChangeText={setEmail}
        />
      </View>
      <View style={styles.inputView}>
        <TextInput
          style={styles.TextInput}
          value={password}
          placeholder="Password."
          placeholderTextColor="#003f5c"
          secureTextEntry={true}
          onChangeText={setPassword}
        />
      </View>
      {error && <Text style={{ color: "red" }}>{error}</Text>}
      <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
        <Text style={styles.TextInput}>LOGIN</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    margin: 20,
    width: "60%",
    height: "30%",
  },
  inputView: {
    backgroundColor: "#7CB9E8",
    borderRadius: 30,
    width: "70%",
    height: 45,
    marginBottom: 20,
    alignItems: "center",
  },
  TextInput: {
    height: 50,
    flex: 1,
    padding: 10,
    marginLeft: 20,
  },
  loginBtn: {
    width: "80%",
    borderRadius: 25,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    backgroundColor: "#FF1493",
  },
});
