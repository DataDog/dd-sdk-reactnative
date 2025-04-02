/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {View, FlatList} from 'react-native';
import React from 'react';
import {useCartStore} from '../../stores/CartStore';
import {CartProductCard} from '../../components/shopist/CartProductCard';

export const ShopistCartProductsScreen = () => {
  const product = useCartStore(state => state.products);
  return (
    <View>
      <FlatList
        data={Object.values(product)}
        renderItem={item => {
          return <CartProductCard product={item.item} />;
        }}
        keyExtractor={item => item.id}
      />
    </View>
  );
};
