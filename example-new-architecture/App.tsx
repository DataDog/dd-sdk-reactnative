import React, {useEffect} from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import SplashScreen from 'react-native-splash-screen';
import HomeScreen from './src/screens/HomeScreen'; // Your main screen

import {
  ImagePrivacyLevel,
  SessionReplay,
  TextAndInputPrivacyLevel,
  TouchPrivacyLevel,
} from '@datadog/mobile-react-native-session-replay';
import {DatadogProvider, DdSdkReactNative} from '@datadog/mobile-react-native';
import {DdRumReactNavigationTracking} from '@datadog/mobile-react-navigation';
import {config} from './datadog';
import Routes from './src/Routes';
import {AccentButton} from './src/components/common/AccentButton';
import {PrimaryButton} from './src/components/common/PrimaryButton';
import SessionReplaySetupScreen from './src/screens/SetupScreen';
import PlaygroundScreen from './src/screens/playground/PlaygroundScreen';
import ButtonsScreen from './src/screens/playground/screens/ButtonsScreen';
import ColorsScreen from './src/screens/playground/screens/ColorsScreen';
import DrawerScreen from './src/screens/playground/screens/DrawerScreen';
import FormsScreen from './src/screens/playground/screens/FormsScreen';
import ImagesScreen from './src/screens/playground/screens/ImagesScreen';
import {ShopistCartProductsScreen} from './src/screens/shopist/ShopistCartProductsScreen';
import {ShopistCategoriesScreen} from './src/screens/shopist/ShopistCategoriesScreen';
import ShopistLoginScreen from './src/screens/shopist/ShopistLoginScreen';
import {ShopistProductsScreen} from './src/screens/shopist/ShopistProductsScreen';
import WebviewScreen from './src/screens/webview/WebviewScreen';
import BiometricsLoginScreen from './src/screens/BiometricLogin';

export const onSDKInitialized = async () => {
  await DdSdkReactNative.setAttributes({
    textAndInputPrivacyLevel: TextAndInputPrivacyLevel.MASK_SENSITIVE_INPUTS, // Defines the way text and input (e.g text fields, checkboxes) should be masked (Default: `MASK_ALL`).
    imagePrivacyLevel: ImagePrivacyLevel.MASK_NONE, // Defines the way images should be masked (Default: `MASK_ALL`).
    touchPrivacyLevel: TouchPrivacyLevel.SHOW, // Defines the way user touches (e.g tap) should be masked (Default: `HIDE`).
  });

  await SessionReplay.enable({
    replaySampleRate: 100, // The percentage of sampled replays, in the range 0.0 - 100.0 (Default: 100.0).
    textAndInputPrivacyLevel: TextAndInputPrivacyLevel.MASK_SENSITIVE_INPUTS, // Defines the way text and input (e.g text fields, checkboxes) should be masked (Default: `MASK_ALL`).
    imagePrivacyLevel: ImagePrivacyLevel.MASK_NONE, // Defines the way images should be masked (Default: `MASK_ALL`).
    touchPrivacyLevel: TouchPrivacyLevel.SHOW, // Defines the way user touches (e.g tap) should be masked (Default: `HIDE`).
  });
};

const Stack = createStackNavigator();

const App = () => {
  const navigationRef = React.useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    const init = async () => {
      await DdSdkReactNative.initialize(config);
      await onSDKInitialized();
      DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);
    };
    init();
    setTimeout(() => {
      SplashScreen.hide();
      console.log('Hiding splash screen');
    }, 2_000);
  }, []);

  return (
    <DatadogProvider configuration={config} onInitialization={onSDKInitialized}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          DdRumReactNavigationTracking.startTrackingViews(
            navigationRef.current,
          );
        }}>
        <Stack.Navigator>
          <Stack.Screen
            name={Routes.SETUP.id}
            component={SessionReplaySetupScreen}
            options={{
              title: Routes.SETUP.name,
            }}
          />
          <Stack.Screen
            name={Routes.HOME.id}
            component={HomeScreen}
            options={{
              title: Routes.HOME.name,
            }}
          />

          <Stack.Screen
            name={Routes.BIOMETRICS_LOGIN.id}
            component={BiometricsLoginScreen}
            options={{
              title: Routes.BIOMETRICS_LOGIN.name,
            }}
          />

          <Stack.Screen
            name={Routes.SHOPIST_LOGIN.id}
            component={ShopistLoginScreen}
            options={{
              title: Routes.SHOPIST_LOGIN.name,
            }}
          />

          <Stack.Screen
            name={Routes.SHOPIST_CATEGORIES.id}
            component={ShopistCategoriesScreen}
            options={{
              title: Routes.SHOPIST_CATEGORIES.name,
              headerRight: () => (
                <AccentButton
                  text="CRASH!"
                  onPress={() => {
                    // crashNativeMainThread('User forced a native crash');
                  }}
                />
              ),
            }}
          />

          <Stack.Screen
            name={Routes.SHOPIST_PRODUCTS.id}
            component={ShopistProductsScreen}
            options={{
              title: Routes.SHOPIST_PRODUCTS.name,
              headerRight: () => (
                <PrimaryButton
                  text="My Cart"
                  onPress={() => {
                    navigationRef.current?.navigate(Routes.SHOPIST_CART.id);
                  }}
                />
              ),
            }}
          />

          <Stack.Screen
            name={Routes.SHOPIST_CART.id}
            component={ShopistCartProductsScreen}
            options={{
              title: Routes.SHOPIST_CART.name,
            }}
          />

          <Stack.Screen
            name={Routes.WEBVIEW.id}
            component={WebviewScreen}
            options={{
              title: Routes.WEBVIEW.name,
            }}
          />

          <Stack.Screen
            name={Routes.PLAYGROUND.id}
            component={PlaygroundScreen}
            options={{
              title: Routes.PLAYGROUND.name,
            }}
          />

          <Stack.Screen
            name={Routes.PLAYGROUND_COLORS.id}
            component={ColorsScreen}
            options={{
              title: Routes.PLAYGROUND_COLORS.name,
            }}
          />

          <Stack.Screen
            name={Routes.PLAYGROUND_BUTTONS.id}
            component={ButtonsScreen}
            options={{
              title: Routes.PLAYGROUND_BUTTONS.name,
            }}
          />

          <Stack.Screen
            name={Routes.FORMS.id}
            component={FormsScreen}
            options={{
              title: Routes.FORMS.name,
            }}
          />

          <Stack.Screen
            name={Routes.IMAGES.id}
            component={ImagesScreen}
            options={{
              title: Routes.IMAGES.name,
            }}
          />

          <Stack.Screen
            name={Routes.DRAWER.id}
            component={DrawerScreen}
            options={{
              title: Routes.DRAWER.name,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </DatadogProvider>
  );
};

export default App;
