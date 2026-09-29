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

    override fun getName(): String = NAME

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
                    "protobufJava" to "3.25.5", "kotlin" to KotlinVersion.CURRENT.toString(),
                    "nativeWorkload" to "client-protobuf boolean benchmark subset",
                    "vm" to System.getProperty("java.vm.version"), "thermalState" to "not measured"
                )
                "experimentSettings" -> mapOf(
                    "mode" to (context.currentActivity?.intent?.getStringExtra("flagsExperiment") ?: ""),
                    "autorun" to (context.currentActivity?.intent?.getStringExtra("flagsRun") ?: "smoke")
                )
                "experimentSnapshot" -> {
                    // Whole-process RSS, not evaluator heap or allocation peak.
                    val rss = File("/proc/${Process.myPid()}/status").readLines()
                        .first { it.startsWith("VmRSS:") }.trim().split(Regex("\\s+"))[1].toLong() * 1024
                    mapOf("residentBytes" to rss, "thermalState" to "not measured")
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
