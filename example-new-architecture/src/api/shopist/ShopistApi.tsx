/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {ShopistCategory} from './models/ShopistCategory';
import {ShopistProduct} from './models/ShopistProduct';
import {shopistApiHost} from '../../../config/hosts.json';

export class ShopistApi {
  private static _instance: ShopistApi | null;
  public static get instance(): ShopistApi {
    if (this._instance == null) {
      this._instance = new ShopistApi();
    }
    return this._instance;
  }

  private constructor() {}

  async getProducts(categoryId: string): Promise<ShopistProduct[]> {
    const url = `https://${shopistApiHost}/category_${categoryId}.json`;
    const response = await fetch(url);
    return await response.json();
  }

  async getCategories(): Promise<ShopistCategory[]> {
    const url = `https://${shopistApiHost}/categories.json`;
    const response = await fetch(url);
    return await response.json();
  }
}
