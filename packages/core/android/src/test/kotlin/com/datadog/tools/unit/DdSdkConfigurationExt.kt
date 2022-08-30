package com.datadog.tools.unit

import com.datadog.reactnative.DdSdkConfiguration
import com.facebook.react.bridge.ReadableMap

fun DdSdkConfiguration.toReadableJavaOnlyMap(): ReadableMap {
    val map = mutableMapOf<String, Any?>()
    map["clientToken"] = clientToken
    map["env"] = env
    applicationId?.let { map.put("applicationId", it) }
    map["nativeCrashReportEnabled"] = nativeCrashReportEnabled != null
    if (sampleRate != null) {
        map["sampleRate"] = sampleRate
    } else {
        // we have to put something, because ReadableMap.asDdSdkConfiguration() will call
        // ReadableMap#getDouble which doesn't allow having null value
        map["sampleRate"] = 100f
    }
    site?.let { map.put("site", it) }
    trackingConsent?.let { map.put("trackingConsent", it) }
    additionalConfig?.let { map.put("additionalConfig", it.toReadableMap()) }
    return map.toReadableMap()
}
