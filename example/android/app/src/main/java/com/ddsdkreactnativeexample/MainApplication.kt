/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
 
 package com.ddsdkreactnativeexample

import com.facebook.react.PackageList
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.flipper.ReactNativeFlipper
import com.reactnativenavigation.NavigationApplication
import com.reactnativenavigation.react.NavigationReactNativeHost


class MainApplication : NavigationApplication() {

    override val reactHost: ReactHost?
        get() = super.reactHost

    override val reactNativeHost: ReactNativeHost
        get() = mReactNativeHost


    private val mReactNativeHost =
            object : NavigationReactNativeHost (this) {

                override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

                override fun getPackages(): ArrayList<ReactPackage> {
                    @SuppressWarnings("UnnecessaryLocalVariable")
                    val packages = PackageList(this).packages
                    // Packages that cannot be autolinked yet can be added manually here, for example:
                    // packages.add(new MyReactNativePackage())
                    return packages
                }

                override fun getJSMainModuleName(): String {
                    return "index"
                }
            }

  @Override
  override fun onCreate() {
    super.onCreate()
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      DefaultNewArchitectureEntryPoint.load()
    }
    ReactNativeFlipper.initializeFlipper(this, reactNativeHost.reactInstanceManager)
  }
}
