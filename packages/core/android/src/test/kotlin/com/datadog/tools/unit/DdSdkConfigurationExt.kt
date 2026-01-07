/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.tools.unit

import com.datadog.android.core.configuration.BatchProcessingLevel
import com.datadog.android.core.configuration.BatchSize
import com.datadog.android.core.configuration.UploadFrequency
import com.datadog.android.rum.configuration.VitalsUpdateFrequency
import com.datadog.reactnative.ConfigurationForTelemetry
import com.datadog.reactnative.DdSdkConfiguration
import com.datadog.reactnative.ProxyAuthenticator
import com.facebook.react.bridge.ReadableMap
import java.net.Proxy

@Suppress("CyclomaticComplexMethod")
fun DdSdkConfiguration.toReadableJavaOnlyMap(): ReadableMap {
    val map = mutableMapOf<String, Any?>()

    map["clientToken"] = clientToken
    map["env"] = env

    site?.let { map["site"] = it }
    service?.let { map["service"] = it }
    verbosity?.let { map["verbosity"] = it }

    map["nativeCrashReportEnabled"] = nativeCrashReportEnabled ?: false

    map["nativeLongTaskThresholdMs"] = nativeLongTaskThresholdMs ?: 0.0

    trackingConsent?.let { map["trackingConsent"] = it }

    map["uploadFrequency"] = uploadFrequency ?: UploadFrequency.AVERAGE.toString()

    map["batchSize"] = batchSize ?: BatchSize.MEDIUM.toString()

    map["batchProcessingLevel"] =
        batchProcessingLevel ?: BatchProcessingLevel.MEDIUM.toString()

    proxyConfiguration?.let { proxyPair ->
        map["proxyConfiguration"] = proxyPair.toReadableMap()
    }

    firstPartyHosts?.let {
        map["firstPartyHosts"] = it.toFirstPartyHostsReadableArray()
    }

    additionalConfiguration?.let {
        map["additionalConfiguration"] = it.toReadableMap()
    }

    run {
        val rum = rumConfiguration
        val rumMap = mutableMapOf<String, Any?>()

        rum?.applicationId?.let { rumMap["applicationId"] = it }
        rumMap["trackFrustrations"] = rum?.trackFrustrations ?: false
        rumMap["longTaskThresholdMs"] = rum?.longTaskThresholdMs ?: 0.0
        rumMap["sessionSampleRate"] = rum?.sessionSampleRate ?: 100.0
        rumMap["vitalsUpdateFrequency"] =
            rum?.vitalsUpdateFrequency ?: VitalsUpdateFrequency.AVERAGE.toString()
        rumMap["trackBackgroundEvents"] = rum?.trackBackgroundEvents ?: false
        rum?.nativeViewTracking?.let { rumMap["nativeViewTracking"] = it }
        rum?.nativeInteractionTracking?.let { rumMap["nativeInteractionTracking"] = it }
        rum?.trackNonFatalAnrs?.let { rumMap["trackNonFatalAnrs"] = it }
        rumMap["initialResourceThreshold"] = rum?.initialResourceThreshold ?: 0.1
        rumMap["telemetrySampleRate"] = rum?.telemetrySampleRate ?: 20.0
        rum?.customEndpoint?.let { rumMap["customEndpoint"] = it }
        map["rumConfiguration"] = rumMap.toReadableMap()
    }

    logsConfiguration?.let { logs ->
        val logsMap = mutableMapOf<String, Any?>()
        logsMap["bundleLogsWithRum"] = logs.bundleLogsWithRum
        logsMap["bundleLogsWithTraces"] = logs.bundleLogsWithTraces
        logs.customEndpoint?.let { logsMap["customEndpoint"] = it }

        map["logsConfiguration"] = logsMap.toReadableMap()
    }

    traceConfiguration?.let { trace ->
        val traceMap = mutableMapOf<String, Any?>()
        trace.resourceTraceSampleRate?.let { traceMap["resourceTraceSampleRate"] = it }
        trace.customEndpoint?.let { traceMap["customEndpoint"] = it }

        map["traceConfiguration"] = traceMap.toReadableMap()
    }

    configurationForTelemetry?.let { telemetry ->
        map["configurationForTelemetry"] = telemetry.toReadableJavaOnlyMap()
    }

    return map.toReadableMap()
}

internal fun ConfigurationForTelemetry.toReadableJavaOnlyMap(): ReadableMap {
    val map = mutableMapOf<String, Any?>()
    initializationType?.let { map.put("initializationType", it) }
    trackErrors?.let { map.put("trackErrors", it) }
    trackInteractions?.let { map.put("trackInteractions", it) }
    trackNetworkRequests?.let { map.put("trackNetworkRequests", it) }
    reactVersion?.let { map.put("reactVersion", it) }
    reactNativeVersion?.let { map.put("reactNativeVersion", it) }
    return map.toReadableMap()
}

internal fun Pair<Proxy, ProxyAuthenticator?>.toReadableMap(): ReadableMap {
    val map = mutableMapOf<String, Any?>()
    val inetAddress = first.address().toString()
    val address = inetAddress.substringBeforeLast(":")
    val port = inetAddress.substringAfterLast(":").toInt()
    map.put("type", first.type())
    map.put("address", address)
    map.put("port", port)
    map.put("username", second?.username)
    map.put("password", second?.password)
    return map.toReadableMap()
}
