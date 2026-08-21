/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

@file:Suppress("TooManyFunctions", "StringLiteralDuplication")

package com.datadog.reactnative

import android.util.Log
import com.datadog.android.trace.TracingHeaderType
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import java.net.InetSocketAddress
import java.net.Proxy
import java.util.Locale

internal fun ReadableMap.asDdSdkConfiguration(): DdSdkConfiguration {
    val additionalConfiguration = getMap("additionalConfiguration")?.toHashMap()

    val rumMap = getMap("rumConfiguration")
    val logsMap = getMap("logsConfiguration")
    val traceMap = getMap("traceConfiguration")
    val telemetryMap = getMap("configurationForTelemetry")

    val rumConfiguration: RumConfiguration? = rumMap?.let { rm ->
        val applicationId = rm.getString("applicationId").orEmpty()

        RumConfiguration(
            applicationId = applicationId,
            trackFrustrations = rm.getBooleanOrNull("trackFrustrations"),
            longTaskThresholdMs = rm.getDoubleOrNull("longTaskThresholdMs") ?: 0.0,
            sessionSampleRate = rm.getDoubleOrNull("sessionSampleRate"),
            resourceTraceSampleRate = rm.getDoubleOrNull("resourceTraceSampleRate"),
            vitalsUpdateFrequency = rm.getString("vitalsUpdateFrequency"),
            trackBackgroundEvents = rm.getBooleanOrNull("trackBackgroundEvents"),
            nativeCrashReportEnabled = rm.getBooleanOrNull("nativeCrashReportEnabled"),
            nativeLongTaskThresholdMs = rm.getDoubleOrNull("nativeLongTaskThresholdMs"),
            nativeViewTracking = rm.getBooleanOrNull("nativeViewTracking"),
            nativeInteractionTracking = rm.getBooleanOrNull("nativeInteractionTracking"),
            firstPartyHosts = rm.getArray("firstPartyHosts")?.asFirstPartyHosts(),
            trackNonFatalAnrs = rm.getBooleanOrNull("trackNonFatalAnrs"),
            initialResourceThreshold = rm.getDoubleOrNull("initialResourceThreshold"),
            telemetrySampleRate = rm.getDoubleOrNull("telemetrySampleRate"),
            customEndpoint = rm.getString("customEndpoint"),
            timeseries = rm.getMap("unstable_timeseries")?.asTimeseriesConfiguration()
        )
    }

    val logsConfiguration: LogsConfiguration? = logsMap?.let { lm ->
        LogsConfiguration(
            bundleLogsWithRum = lm.getBooleanOrNull("bundleLogsWithRum") ?: true,
            bundleLogsWithTraces = lm.getBooleanOrNull("bundleLogsWithTraces") ?: true,
            customEndpoint = lm.getString("customEndpoint")
        )
    }

    val traceConfiguration: TraceConfiguration? = traceMap?.let { tm ->
        TraceConfiguration(
            customEndpoint = tm.getString("customEndpoint")
        )
    }

    val configurationForTelemetry: ConfigurationForTelemetry? =
        telemetryMap?.asConfigurationForTelemetry()

    return DdSdkConfiguration(
        additionalConfiguration = additionalConfiguration?.mapValues { it.value },
        clientToken = getString("clientToken").orEmpty(),
        env = getString("env").orEmpty(),
        site = getString("site"),
        service = getString("service"),
        verbosity = getString("verbosity"),
        trackingConsent = getString("trackingConsent"),
        uploadFrequency = getString("uploadFrequency"),
        batchSize = getString("batchSize"),
        batchProcessingLevel = getString("batchProcessingLevel"),
        proxyConfiguration = getMap("proxyConfiguration")?.asProxyConfig(),
        rumConfiguration = rumConfiguration,
        logsConfiguration = logsConfiguration,
        traceConfiguration = traceConfiguration,
        configurationForTelemetry = configurationForTelemetry
    )
}


internal fun ReadableMap.asTimeseriesConfiguration(): TimeseriesConfiguration {
    return TimeseriesConfiguration(
        collectTypes = getArray("collectTypes")?.toArrayList()?.filterIsInstance<String>()
    )
}

internal fun ReadableMap.asConfigurationForTelemetry(): ConfigurationForTelemetry {
    return ConfigurationForTelemetry(
        initializationType = getString("initializationType"),
        trackErrors = getBoolean("trackErrors"),
        trackInteractions = getBoolean("trackInteractions"),
        trackNetworkRequests = getBoolean("trackNetworkRequests"),
        reactVersion = getString("reactVersion"),
        reactNativeVersion = getString("reactNativeVersion"),
    )
}

@Suppress("CyclomaticComplexMethod")
internal fun ReadableMap.asProxyConfig(): Pair<Proxy, ProxyAuthenticator?>? {
    val address: String? = getString("address")

    // getInt expects the value to be non-null
    var port: Int? = null
    if (hasKey("port")) {
        port = getInt("port")
    }

    val type = getString("type")

    return if (address != null && port != null && type != null) {
        buildProxyConfig(
            type,
            address,
            port,
            getString("username"),
            getString("password")
        )
    } else {
        null
    }
}

internal fun ReadableArray.asFirstPartyHosts(): Map<String, Set<TracingHeaderType>> {
    return this.toList().mapNotNull {
        if (it == null) {
            null
        } else if (it !is Map<*, *>) {
            Log.e(
                javaClass.simpleName,
                "Ignoring $it (${it.javaClass.simpleName}) because it is not of type Map"
            )
            null
        } else {
            val match = it["match"] as? String

            @Suppress("UNCHECKED_CAST")
            val propagatorTypes = it["propagatorTypes"] as? List<String>

            if (match != null && propagatorTypes != null) {
                JSONFirstPartyHost(match, propagatorTypes)
            } else {
                null
            }
        }
    }.asFirstPartyHosts()
}

internal object DefaultConfiguration {
    const val nativeCrashReportEnabled = false
    const val sessionSamplingRate = 100.0
    const val site = "US1"
    const val longTaskThresholdMs = 0.0
    const val nativeLongTaskThresholdMs = 200.0
    const val nativeViewTracking = false
    const val nativeInteractionTracking = false
    const val trackingConsent = "GRANTED"
    const val telemetrySampleRate = 20.0
    const val vitalsUpdateFrequency = "AVERAGE"
    const val trackFrustrations = true
    const val uploadFrequency = "AVERAGE"
    const val batchSize = "MEDIUM"
    const val trackBackgroundEvents = false
    const val bundleLogsWithRum = true
    const val bundleLogsWithTraces = true
    const val initialResourceThreshold = 0.1
}

@Suppress("CyclomaticComplexMethod")
internal fun JSONDdSdkConfiguration.asDdSdkConfiguration(): DdSdkConfiguration {
    val rumConfiguration: RumConfiguration? = this.rumConfiguration?.let { rum ->
        RumConfiguration(
            applicationId = rum.applicationId ?: "",
            trackFrustrations = rum.trackFrustrations ?: DefaultConfiguration.trackFrustrations,
            longTaskThresholdMs = rum.longTaskThresholdMs ?: DefaultConfiguration.longTaskThresholdMs,
            sessionSampleRate = rum.sessionSampleRate ?: DefaultConfiguration.sessionSamplingRate,
            resourceTraceSampleRate = rum.resourceTraceSampleRate,
            vitalsUpdateFrequency = rum.vitalsUpdateFrequency ?: DefaultConfiguration.vitalsUpdateFrequency,
            trackBackgroundEvents = rum.trackBackgroundEvents ?: DefaultConfiguration.trackBackgroundEvents,
            nativeCrashReportEnabled = rum.nativeCrashReportEnabled ?: DefaultConfiguration.nativeCrashReportEnabled,
            nativeLongTaskThresholdMs = rum.nativeLongTaskThresholdMs ?: DefaultConfiguration.nativeLongTaskThresholdMs,
            nativeViewTracking = rum.nativeViewTracking ?: DefaultConfiguration.nativeViewTracking,
            nativeInteractionTracking = rum.nativeInteractionTracking ?: DefaultConfiguration.nativeInteractionTracking,
            firstPartyHosts = rum.firstPartyHosts?.asFirstPartyHosts(),
            trackNonFatalAnrs = rum.trackNonFatalAnrs,
            initialResourceThreshold = rum.initialResourceThreshold ?: DefaultConfiguration.initialResourceThreshold,
            telemetrySampleRate = rum.telemetrySampleRate?.toDouble()
                ?: DefaultConfiguration.telemetrySampleRate,
            customEndpoint = rum.customEndpoint,
            timeseries = rum.unstable_timeseries?.asTimeseriesConfiguration()
        )
    }

    val logsConfiguration: LogsConfiguration? = this.logsConfiguration?.let { logs ->
        LogsConfiguration(
            bundleLogsWithRum = logs.bundleLogsWithRum ?: DefaultConfiguration.bundleLogsWithRum,
            bundleLogsWithTraces = logs.bundleLogsWithTraces ?: DefaultConfiguration.bundleLogsWithTraces,
            customEndpoint = logs.customEndpoint
        )
    }

    val traceConfiguration: TraceConfiguration? = this.traceConfiguration?.let { trace ->
        TraceConfiguration(
            customEndpoint = trace.customEndpoint
        )
    }

    val baseAdditionalConfig = this.additionalConfiguration?.toMutableMap() ?: mutableMapOf()
    baseAdditionalConfig["_dd.source"] = "react-native"
    baseAdditionalConfig["_dd.sdk_version"] = SDK_VERSION

    return DdSdkConfiguration(
        additionalConfiguration = baseAdditionalConfig,
        clientToken = this.clientToken,
        env = this.env,
        site = this.site?: DefaultConfiguration.site,
        service = this.service,
        verbosity = this.verbosity,
        trackingConsent = this.trackingConsent ?: DefaultConfiguration.trackingConsent,
        uploadFrequency = this.uploadFrequency ?: DefaultConfiguration.uploadFrequency,
        batchSize = this.batchSize?: DefaultConfiguration.batchSize,
        batchProcessingLevel = this.batchProcessingLevel,
        proxyConfiguration = this.proxyConfiguration?.asProxyConfig(),
        rumConfiguration = rumConfiguration,
        logsConfiguration = logsConfiguration,
        traceConfiguration = traceConfiguration,
        configurationForTelemetry = null
    )
}


internal fun JSONTimeseriesConfiguration.asTimeseriesConfiguration(): TimeseriesConfiguration {
    return TimeseriesConfiguration(
        collectTypes = this.collectTypes
    )
}

internal fun JSONProxyConfiguration.asProxyConfig(): Pair<Proxy, ProxyAuthenticator?>? {
    return buildProxyConfig(type, address, port, username, password)
}

internal fun List<JSONFirstPartyHost>.asFirstPartyHosts(): Map<String, Set<TracingHeaderType>> {
    /**
     * Adapts the data format from the React Native SDK configuration to match with the Android
     * SDK configuration. For example:
     *
     * RN config: [{ match: "example.com", propagatorTypes: [DATADOG, B3] }] Android config: {
     * "example.com": [DATADOG, B3] }
     */
    val firstPartyHostsWithHeaderTypes = mutableMapOf<String, MutableSet<TracingHeaderType>>()

    for (host in this) {
        if (host.propagatorTypes.isNotEmpty()) {
            val hostMatch = firstPartyHostsWithHeaderTypes[host.match]
            if (hostMatch != null) {
                hostMatch.addAll(host.propagatorTypes.asTracingHeaderTypes())
            } else {
                firstPartyHostsWithHeaderTypes[host.match] = host.propagatorTypes.asTracingHeaderTypes().toMutableSet()
            }
        }
    }

    return firstPartyHostsWithHeaderTypes
}

internal fun List<String>.asTracingHeaderTypes(): Set<TracingHeaderType> {
    return this.mapNotNull {
        when (it.lowercase(Locale.US)) {
            "datadog" -> TracingHeaderType.DATADOG
            "b3" -> TracingHeaderType.B3
            "b3multi" -> TracingHeaderType.B3MULTI
            "tracecontext" -> TracingHeaderType.TRACECONTEXT
            else -> null
        }
    }.toSet()
}

@Suppress("LongMethod", "CyclomaticComplexMethod", "NestedBlockDepth")
internal fun DdSdkConfiguration.toReadableMap(): ReadableMap {
    val map = WritableNativeMap()

    map.putString("clientToken", clientToken)
    map.putString("env", env)
    map.putString("site", site.toString())
    service?.let { map.putString("service", it) }
    verbosity?.let { map.putString("verbosity", it) }
    map.putString("trackingConsent", trackingConsent.toString())
    map.putString("uploadFrequency", uploadFrequency.toString())
    map.putString("batchSize", batchSize.toString())
    map.putString("batchProcessingLevel", batchProcessingLevel.toString())
    additionalConfiguration?.let { map.putMap("additionalConfiguration", it.toWritableMap()) }
    proxyConfiguration?.let { (proxy, authenticator) ->
        val proxyMap = WritableNativeMap()
        val addr = proxy.address()
        if (addr is java.net.InetSocketAddress) {
            proxyMap.putString("address", addr.hostString)
            proxyMap.putInt("port", addr.port)
        }
        proxyMap.putString(
            "type",
            when (proxy.type()) {
                Proxy.Type.HTTP -> "HTTP"
                Proxy.Type.SOCKS -> "SOCKS"
                else -> proxy.type().name
            }
        )
        map.putMap("proxyConfiguration", proxyMap)
    }
    rumConfiguration?.let { rum ->
        val rumMap = WritableNativeMap()
        rumMap.putString("applicationId", rum.applicationId)
        rum.trackFrustrations?.let { rumMap.putBoolean("trackFrustrations", it) }
        rum.longTaskThresholdMs?.let { rumMap.putDouble("longTaskThresholdMs", it) }
        rum.sessionSampleRate?.let { rumMap.putDouble("sessionSampleRate", it) }
        rum.resourceTraceSampleRate?.let { rumMap.putDouble("resourceTraceSampleRate", it) }
        rum.vitalsUpdateFrequency?.let { rumMap.putString("vitalsUpdateFrequency", it) }
        rum.trackBackgroundEvents?.let { rumMap.putBoolean("trackBackgroundEvents", it) }
        rum.nativeCrashReportEnabled?.let { rumMap.putBoolean("nativeCrashReportEnabled", it) }
        rum.nativeLongTaskThresholdMs?.let { rumMap.putDouble("nativeLongTaskThresholdMs", it) }
        rum.nativeViewTracking?.let { rumMap.putBoolean("nativeViewTracking", it) }
        rum.nativeInteractionTracking?.let { rumMap.putBoolean("nativeInteractionTracking", it) }
        rum.trackNonFatalAnrs?.let { rumMap.putBoolean("trackNonFatalAnrs", it) }
        rum.firstPartyHosts?.let { hosts ->
            val hostsArray = WritableNativeArray()
            hosts.forEach { (match, types) ->
                val hostMap = WritableNativeMap()
                hostMap.putString("match", match)
                val propagatorsArray = WritableNativeArray()
                types.forEach { type ->
                    propagatorsArray.pushString(type.toString())
                }
                hostMap.putArray("propagatorTypes", propagatorsArray)
                hostsArray.pushMap(hostMap)
            }
            rumMap.putArray("firstPartyHosts", hostsArray)
        }
        rum.initialResourceThreshold?.let { rumMap.putDouble("initialResourceThreshold", it) }
        rum.telemetrySampleRate?.let { rumMap.putDouble("telemetrySampleRate", it) }
        rum.customEndpoint?.let { rumMap.putString("customEndpoint", it) }
        rum.timeseries?.let { timeseries ->
            val timeseriesMap = WritableNativeMap()
            timeseries.collectTypes?.let { types ->
                val typesArray = WritableNativeArray()
                types.forEach { typesArray.pushString(it) }
                timeseriesMap.putArray("collectTypes", typesArray)
            }
            rumMap.putMap("unstable_timeseries", timeseriesMap)
        }

        map.putMap("rumConfiguration", rumMap)
    }
    logsConfiguration?.let { logs ->
        val logsMap = WritableNativeMap()
        logsMap.putBoolean("bundleLogsWithRum", logs.bundleLogsWithRum)
        logsMap.putBoolean("bundleLogsWithTraces", logs.bundleLogsWithTraces)
        logs.customEndpoint?.let { logsMap.putString("customEndpoint", it) }
        map.putMap("logsConfiguration", logsMap)
    }
    traceConfiguration?.let { trace ->
        val traceMap = WritableNativeMap()
        trace.customEndpoint?.let { traceMap.putString("customEndpoint", it) }
        map.putMap("traceConfiguration", traceMap)
    }
    configurationForTelemetry?.let { telemetry ->
        val telemetryMap = WritableNativeMap()
        telemetry.initializationType?.let { telemetryMap.putString("initializationType", it) }
        telemetry.trackErrors?.let { telemetryMap.putBoolean("trackErrors", it) }
        telemetry.trackInteractions?.let { telemetryMap.putBoolean("trackInteractions", it) }
        telemetry.trackNetworkRequests?.let { telemetryMap.putBoolean("trackNetworkRequests", it) }
        telemetry.reactVersion?.let { telemetryMap.putString("reactVersion", it) }
        telemetry.reactNativeVersion?.let { telemetryMap.putString("reactNativeVersion", it) }
        map.putMap("configurationForTelemetry", telemetryMap)
    }

    return map
}


internal fun ConfigurationForTelemetry.toReadableMap(): ReadableMap {
    val map = WritableNativeMap()
    initializationType?.let { map.putString("initializationType", it) }
    trackErrors?.let { map.putBoolean("trackErrors", it) }
    trackInteractions?.let { map.putBoolean("trackInteractions", it) }
    trackNetworkRequests?.let { map.putBoolean("trackNetworkRequests", it) }
    reactVersion?.let { map.putString("reactVersion", it) }
    reactNativeVersion?.let { map.putString("reactNativeVersion", it) }
    return map
}

private fun buildProxyConfig(
    type: String,
    address: String,
    port: Int,
    username: String?,
    password: String?
): Pair<Proxy, ProxyAuthenticator?>? {
    val proxyType = when (type.lowercase(Locale.US)) {
        "http", "https" -> Proxy.Type.HTTP
        "socks" -> Proxy.Type.SOCKS
        else -> {
            Log.w(
                DdSdk::class.java.canonicalName,
                "Unknown proxy type given: $type, skipping proxy configuration."
            )
            null
        }
    } ?: return null

    val proxy = Proxy(proxyType, InetSocketAddress(address, port))

    val authenticator =
        if (username != null && password != null) {
            ProxyAuthenticator(username, password)
        } else {
            null
        }

    return Pair(proxy, authenticator)
}
