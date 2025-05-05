/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.benchmarkvitals

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.turbomodule.core.interfaces.TurboModule
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReadableMap

@ReactModule(name = BenchmarkVitalsModule.NAME)
class BenchmarkVitalsModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), TurboModule {
  companion object {
    const val NAME = "BenchmarkVitals"
  }

  private val impl = BenchmarkVitalsModuleImpl(reactContext)

  override fun getName(): String = NAME

  @ReactMethod
  fun startCollectingVitals(config: ReadableMap, promise: Promise) {
    impl.startCollectingVitals(config, promise)
  }

  @ReactMethod
  fun stopCollectingVitals(promise: Promise) {
    impl.stopCollectingVitals(promise)
  }
}
