/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import Foundation

/// Internal attributes, passed to the iOS SDK.
/// Keep in sync with https://github.com/DataDog/dd-sdk-ios/blob/develop/Sources/Datadog/Core/Attributes/Attributes.swift.
internal struct CrossPlatformAttributes {
    /// Custom app version passed from CP SDK. Used for all events issued by the SDK (both coming from cross-platform SDK and produced internally, like RUM long tasks).
    /// It should replace the default native `version` read from `Info.plist`.
    /// Expects `String` value (semantic version).
    static let version: String = "_dd.version"

    /// Custom SDK version passed from bridge SDK. Used for all events issued by the SDK (both coming from cross-platform SDK and produced internally, like RUM long tasks).
    /// It should replace the default native `sdkVersion`.
    /// Expects `String` value (semantic version).
    static let sdkVersion: String = "_dd.sdk_version"

    /// Custom SDK `source` passed from bridge SDK. Used for all events issued by the SDK (both coming from cross-platform SDK and produced internally, like RUM long tasks).
    /// It should replace the default native `ddsource` value (`"ios"`).
    /// Expects `String` value.
    static let ddsource: String = "_dd.source"

    /// Event timestamp passed from bridge SDK. Used for all RUM events issued by cross platform SDK.
    /// It should replace event time obtained from `DateProvider` to ensure that events are not skewed due to time difference in native and cross-platform SDKs.
    /// Expects `Int64` value (milliseconds).
    static let timestampInMilliseconds = "_dd.timestamp"

    /// Custom "source type" of the error passed from bridge SDK. Used in RUM errors reported by cross platform SDK.
    /// It names the language or platform of the RUM error stack trace, so the SCI backend knows how to symbolicate it.
    /// Expects `String` value.
    static let errorSourceType = "_dd.error.source_type"

    /// Custom attribute of the error passed from bridge SDK. Used in RUM errors reported by cross platform SDK.
    /// It flags the error has being fatal for the host application.
    /// Expects `Bool` value.
    static let errorIsCrash = "_dd.error.is_crash"

    /// Trace ID passed from bridge SDK. Used in RUM resources created by cross platform SDK.
    /// When cross-platform SDK injects tracing headers to intercepted resource, we pass tracing information through this attribute
    /// and send it within the RUM resource, so the RUM backend can issue corresponding APM span on behalf of the mobile app.
    /// Expects `String` value.
    static let traceID = "_dd.trace_id"

    /// Span ID passed from bridge SDK. Used in RUM resources created by cross platform SDK.
    /// When cross-platform SDK injects tracing headers to intercepted resource, we pass tracing information through this attribute
    /// and send it within the RUM resource, so the RUM backend can issue corresponding APM span on behalf of the mobile app.
    /// Expects `String` value.
    static let spanID = "_dd.span_id"
}

/// Internal attributes used to configure the proxy.
internal struct ProxyAttributes {
    /// Expects `String?` value.
    static let address = "_dd.proxy.address"

    /// Expects `String?` value
    static let username = "_dd.proxy.username"

    /// Expects `String?` value
    static let password = "_dd.proxy.password"

    /// Expects `String?` value
    static let type = "_dd.proxy.type"

    /// Expects `String?` or `Int?` value
    static let port = "_dd.proxy.port"
}

/// Internal attributes used by the bridge only, passed from the javascript.
internal struct InternalConfigurationAttributes {
    /// Enables native view tracking.
    /// Expects `Bool?` value
    static let nativeViewTracking = "_dd.native_view_tracking"

    /// Enables native interaction tracking.
    /// Expects `Bool?` value
    static let nativeInteractionTracking = "_dd.native_interaction_tracking"

    /// Enable overriding the service name.
    /// Expects `String?` value
    static let serviceName = "_dd.service_name"

    /// Specify first party hosts for distributed tracing.
    /// Even if the requests are intercepted at the javascript level, we have to pass this parameter to make sure the headers are
    /// correctly set when sending the traces to the intake.
    /// Expects `[String]?` value
    static let firstPartyHosts = "_dd.first_party_hosts"

    /// Specify native SDK verbosity
    /// Expects `NSString?` value
    static let sdkVerbosity = "_dd.sdk_verbosity"

    /// Specify version suffix.
    /// Expects `NSString?` value
    static let versionSuffix = "_dd.version_suffix"

    /// Custom attribute of the resource passed from bridge SDK.
    /// It flags the resource as dropped by the user so it can be dropped in the resource mapper.
    /// Expects `Bool` value.
    static let dropResource = "_dd.resource.drop_resource"

    /// Custom attribute of the action passed from bridge SDK.
    /// It flags the action as dropped by the user so it can be dropped in the action mapper.
    /// Expects `Bool` value.
    static let dropAction = "_dd.action.drop_action"
}

/// Error messages that can be thrown to the JS SDK
internal struct Errors {
    /// Error thrown when a log was sent before the SDK was initialized.
    /// Not sending the log prevent the logger to be set to a Noop logger.
    static let logSentBeforeSDKInit = "DD_INTERNAL_LOG_SENT_BEFORE_SDK_INIT"
}
