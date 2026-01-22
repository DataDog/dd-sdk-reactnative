
/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2025 Datadog, Inc.
 */
import DatadogCore
import DatadogInternal

public class DdTelemetry {
    public static func sendTelemetryLog(message: String, attributes: [String: any Encodable], config: [String: any Encodable]) {
        let id = (config["onlyOnce"] as? Bool) == true ? message : UUID().uuidString
        CoreRegistry.default.telemetry.debug(id: id, message: message, attributes: attributes)
    }

    public static func telemetryDebug(id: String, message: String) {
        return Datadog._internal.telemetry.debug(id: id, message: message)
    }

    public static func telemetryError(id: String, message: String, kind: String?, stack: String?) {
        return Datadog._internal.telemetry.error(id: id, message: message, kind: kind, stack: stack)
    }

    public static func overrideTelemetryConfiguration(
        initializationType: String? = nil,
        reactNativeVersion: String? = nil,
        reactVersion: String? = nil,
        trackCrossPlatformLongTasks: Bool? = nil,
        trackErrors: Bool? = nil,
        trackInteractions: Bool? = nil,
        trackLongTask: Bool? = nil,
        trackNativeErrors: Bool? = nil,
        trackNativeLongTasks: Bool? = nil,
        trackNetworkRequests: Bool? = nil
    ) {
        CoreRegistry.default.telemetry.configuration(
            initializationType: initializationType,
            reactNativeVersion: reactNativeVersion,
            reactVersion: reactVersion,
            trackCrossPlatformLongTasks: trackCrossPlatformLongTasks,
            trackErrors: trackErrors,
            trackLongTask: trackLongTask,
            trackNativeErrors: trackNativeErrors,
            trackNativeLongTasks: trackNativeLongTasks,
            trackNetworkRequests: trackNetworkRequests,
            trackUserInteractions: trackInteractions
        )
    }
}
