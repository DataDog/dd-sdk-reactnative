/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React from 'react';
import {ImageBackground, Text, TouchableHighlight, View} from 'react-native';
import {ShopistProduct} from '../../api/shopist/models/ShopistProduct';
import {useCartStore} from '../../stores/CartStore';

export const ShopistProductCard = ({product}: {product: ShopistProduct}) => {
  const {addProduct} = useCartStore();
  return (
    <TouchableHighlight
      onPress={() => {
        addProduct(product);
      }}
      style={{alignSelf: 'stretch', height: 160}}>
      <ImageBackground
        source={{uri: product.cover}}
        style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(139,75,61,0.6)',
            alignSelf: 'flex-end',
            width: 200,
            padding: 4,
            justifyContent: 'space-between',
          }}>
          <Text style={{color: 'papayawhip', fontSize: 24, textAlign: 'right'}}>
            {product.name}
          </Text>
          <Text style={{color: 'beige', fontSize: 20, textAlign: 'right'}}>
            ${product.price}
          </Text>
        </View>
      </ImageBackground>
    </TouchableHighlight>
  );
};
