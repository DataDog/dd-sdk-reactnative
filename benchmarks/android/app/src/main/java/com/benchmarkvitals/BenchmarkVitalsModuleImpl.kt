/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.benchmarkvitals

import android.content.Context
import com.benchmarkrunner.BuildConfig
import com.facebook.react.bridge.Arguments
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

  fun reportFullyDisplayed(config: ReadableMap, promise: Promise) {
    // Read the end timestamp first, so that nothing below is included in the measure
    val durationMs = FullyDisplayed.elapsedSinceProcessStartMs()

    FullyDisplayed.submit(
      durationMs = durationMs,
      metric = "rn.android.benchmark.ttfd",
      context = FullyDisplayed.MetricContext(
        apiKey = config.getString("apiKey") ?: "",
        run = config.getString("runType") ?: "",
        scenario = config.getString("scenario") ?: "",
        env = BuildConfig.BUILD_TYPE,
        applicationId = BuildConfig.APPLICATION_ID
      )
    )

    promise.resolve(durationMs.toDouble())
  }

  fun armColdStart(config: ReadableMap, promise: Promise) {
    FullyDisplayed.armColdStart(
      context,
      scenario = config.getString("scenario") ?: "",
      runType = config.getString("runType") ?: ""
    )
    promise.resolve(true)
  }

  fun consumeColdStartConfig(promise: Promise) {
    val pendingConfig = FullyDisplayed.consumeColdStartConfig(context)
    if (pendingConfig == null) {
      promise.resolve(null)
    } else {
      promise.resolve(
        Arguments.createMap().apply {
          putString("scenario", pendingConfig.first)
          putString("runType", pendingConfig.second)
        }
      )
    }
  }
}
