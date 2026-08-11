import React, {useState} from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors} from '../theme';

interface LinkProps {
  linkText: string;
  onPress: Function;
  testID?: string;
}

export const Link = ({linkText, onPress, testID}: LinkProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <>
      <TouchableOpacity
        activeOpacity={1}
        style={[styles.linkContainer, focused && styles.focusedContainer]}
        onPress={() => onPress()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        testID={testID}
      >
        <View style={styles.linkTextContainer}>
          {focused ? (
            <Image source={require('../assets/focusedStar.png')} />
          ) : (
            <Image source={require('../assets/star.png')} />
          )}
          <Text style={[styles.linkText, focused && styles.linkTextFocused]}>
            {linkText}
          </Text>
        </View>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  linkContainer: {
    width: 420,
    padding: 12,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  focusedContainer: {
    borderColor: colors.focus,
    backgroundColor: colors.focusSurface,
  },
  linkTextContainer: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 200,
    width: 300,
  },
  linkText: {
    color: colors.text,
    fontSize: 45,
    marginLeft: 30,
  },
  linkTextFocused: {
    color: colors.focusText,
  },
});
