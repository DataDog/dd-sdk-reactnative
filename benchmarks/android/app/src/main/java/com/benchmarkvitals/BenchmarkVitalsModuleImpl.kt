/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.benchmarkvitals

import android.content.Context
import com.benchmarkrunner.BuildConfig
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.datadog.android.Datadog
import com.datadog.benchmark.DatadogVitalsMeter
import com.datadog.benchmark.DatadogExporterConfiguration

private const val METER_INTERVAL_IN_SECONDS = 10L
private const val BENCHMARK_APPLICATION_NAME = "Benchmark RN - Android Application"

class BenchmarkVitalsModuleImpl(private val context: Context) {
  internal lateinit var vitalsMeter: DatadogVitalsMeter

  fun startCollectingVitals(config: ReadableMap, promise: Promise) {
    val runType = config.getString("runType") ?: ""
    val scenario = config.getString("scenario") ?: ""
    val apiKey = config.getString("apiKey") ?: ""

    val exporterConfig = DatadogExporterConfiguration.Builder(apiKey)
      .setApplicationId(BuildConfig.APPLICATION_ID)
      .setApplicationName(BENCHMARK_APPLICATION_NAME)
      .setRun(runType)
      .setScenario(scenario)
      .setApplicationVersion(BuildConfig.VERSION_NAME)
      .setIntervalInSeconds(METER_INTERVAL_IN_SECONDS)
      .build()

    vitalsMeter = DatadogVitalsMeter.create(exporterConfig, Datadog.getInstance())
    vitalsMeter.startMeasuring()

    promise.resolve(true)
  }

  fun stopCollectingVitals(promise: Promise) {
    vitalsMeter.stopMeasuring()
    promise.resolve(true)
  }
}
