/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {create} from 'zustand';
import {Cart} from '../models/Cart';
import {ShopistProduct} from '../api/shopist/models/ShopistProduct';

type State = Cart & {
  addProduct: (product: ShopistProduct) => void;
};

export const useCartStore = create<State>(set => ({
  products: {},
  addProduct: (product: ShopistProduct) =>
    set(state => {
      if (state.products[product.id]) {
        return {
          products: {
            ...state.products,
            [product.id]: {
              ...state.products[product.id],
              quantity: state.products[product.id].quantity + 1,
            },
          },
        };
      }
      return {
        products: {
          ...state.products,
          [product.id]: {
            ...product,
            quantity: 1,
          },
        },
      };
    }),
}));
