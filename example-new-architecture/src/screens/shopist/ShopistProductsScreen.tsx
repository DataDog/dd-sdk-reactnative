/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React from 'react';
import {View, FlatList, ActivityIndicator} from 'react-native';
import {useQuery} from 'react-query';
import {ShopistProductCard} from '../../components/shopist/ProductCard';
import {ShopistApi} from '../../api/shopist/ShopistApi';

export const ShopistProductsScreen = ({route}: any) => {
  const {data, isLoading} = useQuery(['products', route.params.id], () =>
    ShopistApi.instance.getProducts(route.params.id),
  );

  return (
    <View>
      <FlatList
        ListEmptyComponent={
          isLoading ? <ActivityIndicator size="small" /> : null
        }
        renderItem={item => <ShopistProductCard product={item.item} />}
        keyExtractor={item => item.id.toString()}
        data={data}
        ItemSeparatorComponent={() => (
          <View style={{height: 2, backgroundColor: 'salmon'}} />
        )}
      />
    </View>
  );
};
