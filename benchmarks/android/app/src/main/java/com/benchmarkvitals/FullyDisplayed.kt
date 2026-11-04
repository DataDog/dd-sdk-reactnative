/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.benchmarkvitals

import android.content.Context
import android.os.Build
import android.os.Process
import android.os.SystemClock
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

private const val DISTRIBUTION_POINTS_URL = "https://api.datadoghq.com/api/v1/distribution_points"
private const val LOG_TAG = "Benchmark"
private const val TIMEOUT_MS = 10_000
private const val PREFERENCES_NAME = "benchmark"
private const val KEY_PENDING_SCENARIO = "pending_cold_start_scenario"
private const val KEY_PENDING_RUN_TYPE = "pending_cold_start_run_type"

/**
 * Measures the time from process start to the moment the app reports itself as fully displayed,
 * independently from the Datadog SDK, so that `baseline` and `instrumented` runs can be compared.
 *
 * The value is submitted once as a distribution metric, so the median and percentiles can be
 * computed across runs.
 */
internal object FullyDisplayed {

  internal data class MetricContext(
    val apiKey: String,
    val run: String,
    val scenario: String,
    val env: String,
    val applicationId: String
  )

  /**
   * Saves the cold start test config, to run it on the next launch of the app.
   *
   * The time to fully displayed is measured from process start, so the scenario cannot be started
   * by a deep link opened in a running app: it must be armed, then the app must be restarted.
   */
  fun armColdStart(context: Context, scenario: String, runType: String) {
    context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_PENDING_SCENARIO, scenario)
      .putString(KEY_PENDING_RUN_TYPE, runType)
      // Written synchronously, as the app is about to be killed
      .commit()
  }

  /**
   * Returns the armed cold start (scenario, run type), if any, and removes it so it runs only once.
   */
  fun consumeColdStartConfig(context: Context): Pair<String, String>? {
    val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
    val scenario = preferences.getString(KEY_PENDING_SCENARIO, null) ?: return null
    val runType = preferences.getString(KEY_PENDING_RUN_TYPE, null) ?: ""
    preferences.edit().clear().commit()
    return scenario to runType
  }

  /**
   * Returns the time elapsed since the process started, in milliseconds.
   *
   * This is the same reference the Datadog Android SDK uses for app launch metrics.
   */
  fun elapsedSinceProcessStartMs(): Long {
    return SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime()
  }

  /**
   * Submits the time to fully displayed, in milliseconds.
   */
  fun submit(durationMs: Long, metric: String, context: MetricContext) {
    val tags = JSONArray(
      listOf(
        "device_model:${Build.MODEL}",
        "os_version:${Build.VERSION.RELEASE}",
        "run:${context.run}",
        "scenario:${context.scenario}",
        "env:${context.env}",
        "application_id:${context.applicationId}"
      )
    )
    val point = JSONArray()
      .put(TimeUnit.MILLISECONDS.toSeconds(System.currentTimeMillis()))
      .put(JSONArray().put(durationMs))
    val body = JSONObject().put(
      "series",
      JSONArray().put(
        JSONObject()
          .put("metric", metric)
          .put("points", JSONArray().put(point))
          .put("tags", tags)
      )
    )

    thread(name = "benchmark-ttfd-upload") {
      @Suppress("TooGenericExceptionCaught")
      try {
        val connection = URL(DISTRIBUTION_POINTS_URL).openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.connectTimeout = TIMEOUT_MS
        connection.readTimeout = TIMEOUT_MS
        connection.doOutput = true
        connection.setRequestProperty("Content-Type", "application/json")
        connection.setRequestProperty("DD-API-KEY", context.apiKey)
        connection.outputStream.use { it.write(body.toString().toByteArray()) }

        val statusCode = connection.responseCode
        if (statusCode !in 200..299) {
          Log.e(LOG_TAG, "Failed to submit $metric: HTTP $statusCode")
        }
        connection.disconnect()
      } catch (e: Exception) {
        Log.e(LOG_TAG, "Failed to submit $metric", e)
      }
    }
  }
}
