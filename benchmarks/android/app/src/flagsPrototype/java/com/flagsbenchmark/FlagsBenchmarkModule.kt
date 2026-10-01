/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

package com.flagsbenchmark

import android.os.Build
import android.os.Process
import com.benchmarkrunner.BuildConfig
import com.benchmarkvitals.NativeFlagsBenchmarkSpec
import com.datadog.flags.benchmark.FlagsBenchmark
import com.datadog.android.Datadog
import com.datadog.android._InternalProxy
import com.datadog.android.core.configuration.Configuration
import com.datadog.android.core.configuration.BatchSize
import com.datadog.android.core.configuration.UploadFrequency
import com.datadog.android.flags.Flags
import com.datadog.android.flags.FlagsClient
import com.datadog.android.flags.FlagsConfiguration
import com.datadog.android.privacy.TrackingConsent
import com.datadog.reactnative.DdFlagsImplementation
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.PromiseImpl
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import org.json.JSONObject
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors

@ReactModule(name = FlagsBenchmarkModule.NAME)
class FlagsBenchmarkModule(private val context: ReactApplicationContext) : NativeFlagsBenchmarkSpec(context) {
    private val cache = File(context.cacheDir, "flags-benchmark-${UUID.randomUUID()}.bin")
    private val evaluator = FlagsBenchmark(cache)
    private val lock = Any()
    private val queue = Executors.newSingleThreadExecutor()
    private val emulator = Build.HARDWARE in listOf("ranchu", "goldfish")
    private var initialization: Map<String, Any?>? = null
    private val tracking by lazy { DdFlagsImplementation() }

    private fun settings(): Map<String, Any?> {
        val intent = requireNotNull(context.currentActivity?.intent)
        val mode = intent.getStringExtra("flagsExperiment") ?: ""
        if ((mode in listOf("none", "bridge-only", "exposures", "evaluations", "both") || mode.startsWith("batching-")) && initialization == null) {
            check(!BuildConfig.DEBUG) { "Tracking requires a Release emulator build" }
            val port = intent.getIntExtra("flagsSinkPort", 0)
            require(port in 1..65535) { "Missing loopback collector port" }
            val endpoint = "http://127.0.0.1:$port"
            val config = Configuration.Builder("synthetic-benchmark-only", "benchmark", "", "flags-benchmark")
                .setBatchSize(BatchSize.SMALL)
                .setUploadFrequency(UploadFrequency.FREQUENT)
            val core = requireNotNull(Datadog.initialize(context, _InternalProxy.allowClearTextHttp(config).build(), TrackingConsent.GRANTED))
            Datadog.clearAllData(core)
            Flags.enable(FlagsConfiguration.Builder()
                .trackExposures(mode == "exposures" || mode == "both" || mode.startsWith("batching-"))
                .trackEvaluations(mode == "evaluations" || mode == "both" || mode.startsWith("batching-"))
                .rumIntegrationEnabled(false)
                .evaluationFlushInterval(1000)
                .useCustomFlagEndpoint("$endpoint/config")
                .useCustomExposureEndpoint("$endpoint/exposures")
                .useCustomEvaluationEndpoint("$endpoint/evaluations")
                .build(), core)
            val client = FlagsClient.Builder("benchmark-preflight", core).build()
            check(client.javaClass.simpleName == "DatadogFlagsClient") { "Native flags initialization failed" }
            initialization = mapOf("coreType" to core.javaClass.simpleName, "clientType" to client.javaClass.simpleName)
        }
        return mapOf("mode" to mode, "initialization" to initialization,
            "autorun" to (intent.getStringExtra("flagsRun") ?: "smoke"))
    }

    private fun snapshot(): Map<String, Any?> {
        // Whole-process RSS, not evaluator heap or allocation peak.
        val rss = File("/proc/${Process.myPid()}/status").readLines()
            .first { it.startsWith("VmRSS:") }.trim().split(Regex("\\s+"))[1].toLong() * 1024
        return mapOf("residentBytes" to rss, "thermalState" to "not measured")
    }

    override fun getName(): String = NAME

    override fun trackBatch(records: ReadableArray, promise: Promise) {
        try {
            check(emulator && !BuildConfig.DEBUG && initialization != null)
            require(records.size() in 1..25)
            for (index in 0 until records.size()) {
                val record = requireNotNull(records.getMap(index))
                var resolved = false
                var failure: String? = null
                tracking.trackEvaluation(
                    requireNotNull(record.getString("client")), requireNotNull(record.getString("key")),
                    requireNotNull(record.getMap("flag")), requireNotNull(record.getString("targetingKey")),
                    requireNotNull(record.getMap("attributes")),
                    PromiseImpl(Callback { resolved = true }, Callback { args -> failure = args.contentToString() })
                )
                check(failure == null && resolved) { failure ?: "Tracking implementation did not acknowledge synchronously" }
            }
            promise.resolve(null)
        } catch (exception: Exception) {
            promise.reject("BATCH_TRACKING_FAILED", exception)
        }
    }

    override fun runSync(request: ReadableMap): WritableMap = Arguments.makeNativeMap(execute(request.toHashMap()))

    override fun runAsync(request: ReadableMap, promise: Promise) {
        val input = request.toHashMap()
        queue.execute { promise.resolve(Arguments.makeNativeMap(execute(input))) }
    }

    private fun execute(request: Map<String, Any?>): Map<String, Any?> = synchronized(lock) {
        try {
            // Never run a benchmark on a physical Android device through this prototype.
            check(emulator) { "Android benchmark is emulator-only" }
            when (request["op"]) {
                "metadata" -> mapOf(
                    "platform" to "android", "os" to "Android ${Build.VERSION.RELEASE} / API ${Build.VERSION.SDK_INT}",
                    "machine" to Build.MODEL, "abis" to Build.SUPPORTED_ABIS.toList(),
                    "simulator" to true, "nativeDebug" to BuildConfig.DEBUG,
                    "newArchitecture" to BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
                    "protobufJava" to "3.25.5", "kotlin" to KotlinVersion.CURRENT.toString(), "datadogFlags" to "3.13.1",
                    "nativeWorkload" to "client-protobuf boolean benchmark subset",
                    "vm" to System.getProperty("java.vm.version"), "thermalState" to "not measured"
                )
                "experimentSettings" -> settings()
                "experimentSnapshot" -> snapshot()
                "experimentFlush" -> {
                    check(initialization != null) { "Native tracking not initialized" }
                    // Test-only drain after the aggregation timer; called on the worker queue.
                    Datadog._internalProxy().flushAndShutdownExecutors()
                    snapshot() + mapOf("initialization" to initialization)
                }
                "saveReport" -> {
                    val json = request["json"] as String
                    JSONObject(json)
                    val directory = requireNotNull(context.getExternalFilesDir(null))
                    val report = File(directory, "flags-benchmark-result.json")
                    val temporary = File(directory, "flags-benchmark-result.tmp")
                    temporary.writeText(json)
                    check(temporary.renameTo(report))
                    mapOf("path" to report.path)
                }
                else -> evaluator.run(request)
            }
        } catch (exception: Exception) {
            mapOf("benchmarkError" to "${exception.javaClass.simpleName}: ${exception.message}")
        }
    }

    override fun invalidate() {
        queue.execute { synchronized(lock) { cache.delete() } }
        queue.shutdown()
        super.invalidate()
    }

    companion object { const val NAME = "FlagsBenchmark" }
}
