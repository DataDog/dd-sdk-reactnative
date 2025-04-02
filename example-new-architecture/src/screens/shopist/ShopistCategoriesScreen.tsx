/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useQuery } from "react-query";
import { CategoryCard } from "../../components/shopist/CategoryCard";
import { ShopistApi } from "../../api/shopist/ShopistApi";
import { ShopistCategory } from "../../api/shopist/models/ShopistCategory";

export function ShopistCategoriesScreen() {
  const { data, isLoading } = useQuery(
    "todos",
    ShopistApi.instance.getCategories,
  );
  return (
    <View testID="email" style={{ flex: 1 }}>
      <FlatList
        ListEmptyComponent={
          isLoading ? <ActivityIndicator size="small" /> : null
        }
        renderItem={({ item }: { item: ShopistCategory }) => (
          <CategoryCard category={item} />
        )}
        keyExtractor={(item) => item.id.toString()}
        data={data}
      />
    </View>
  );
}
