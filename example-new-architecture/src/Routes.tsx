/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

type Page =
  | 'SETUP'
  | 'HOME'
  | 'BIOMETRICS_LOGIN'
  | 'SHOPIST_LOGIN'
  | 'SHOPIST_CATEGORIES'
  | 'SHOPIST_PRODUCTS'
  | 'SHOPIST_CART'
  | 'WEBVIEW'
  | 'PLAYGROUND'
  | 'PLAYGROUND_COLORS'
  | 'PLAYGROUND_BUTTONS'
  | 'FORMS'
  | 'IMAGES'
  | 'DRAWER';

type ScreensMap = {[Key in Page]: string};
type RoutesMap = {[Key in Page]: {name: string; id: string}};

const screens: ScreensMap = {
  SETUP: 'Setup',
  HOME: 'Home',
  BIOMETRICS_LOGIN: 'Biometrics Login',
  SHOPIST_LOGIN: 'Login',
  SHOPIST_CATEGORIES: 'Categories',
  SHOPIST_PRODUCTS: 'Products',
  SHOPIST_CART: 'My Cart',
  WEBVIEW: 'Webview',
  PLAYGROUND: 'Playground',
  PLAYGROUND_COLORS: 'Colors',
  PLAYGROUND_BUTTONS: 'Buttons',
  FORMS: 'Forms',
  IMAGES: 'Images',
  DRAWER: 'Drawer',
};

const Routes: RoutesMap = (function (): RoutesMap {
  let _routes: RoutesMap = {} as RoutesMap;
  Object.keys(screens).forEach(key => {
    _routes[key as keyof ScreensMap] = {
      name: screens[key as keyof ScreensMap],
      id: key,
    };
  });
  return _routes;
})();

export default Routes;
