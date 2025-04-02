/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {DdLogs} from '@datadog/mobile-react-native';
import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {ImageBackground, Text, TouchableHighlight} from 'react-native';
import {ShopistCategory} from '../../api/shopist/models/ShopistCategory';
import Routes from '../../Routes';

export function CategoryCard({category}: {category: ShopistCategory}) {
  const {navigate} = useNavigation<any>();

  const navigateDog = () => {
    DdLogs.info('Try the info logs', {});
    DdLogs.warn('Warn about the warn logs', {});
    navigate(Routes.SHOPIST_PRODUCTS.id, {id: category.id});
  };

  return (
    <TouchableHighlight
      onPress={navigateDog}
      style={{alignSelf: 'stretch', height: 100}}>
      <ImageBackground
        source={{uri: category.cover}}
        style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <Text
          style={{
            color: 'salmon',
            fontSize: 80,
            top: 4,
            right: 2,
          }}>
          {category.title}
        </Text>
        <Text style={{color: 'papayawhip', fontSize: 80, position: 'absolute'}}>
          {category.title}
        </Text>
      </ImageBackground>
    </TouchableHighlight>
  );
}
