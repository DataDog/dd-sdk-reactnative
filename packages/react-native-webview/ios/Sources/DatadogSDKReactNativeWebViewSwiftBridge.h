/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Imports the Objective-C interface of this package's Swift sources. Where it comes from depends on
// the build system:
// - CocoaPods compiles Swift and Objective-C into one pod, and generates DatadogSDKReactNativeWebView-Swift.h.
// - Swift Package Manager cannot mix languages in one target, so the Swift sources are a separate
//   module, which is only reachable as a module.
//
// Only Objective-C (.m) files may include this header: `@import` is rejected in Objective-C++, and
// React Native's headers do not build as C++ modules.

#ifndef DatadogSDKReactNativeWebViewSwiftBridge_h
#define DatadogSDKReactNativeWebViewSwiftBridge_h

// DD_RN_SWIFTPM_WEBVIEW is set by Package.swift for this package's own target only. React Native's
// SwiftPM autolinking also copies this header into a header tree shared by every library, where
// other targets may parse it: there, none of the branches below applies and it imports nothing.
#if DD_RN_SWIFTPM_WEBVIEW
@import DatadogSDKReactNativeWebView;
#elif __has_include("DatadogSDKReactNativeWebView-Swift.h")
#import <DatadogSDKReactNativeWebView-Swift.h>
#elif __has_include(<DatadogSDKReactNativeWebView/DatadogSDKReactNativeWebView-Swift.h>)
#import <DatadogSDKReactNativeWebView/DatadogSDKReactNativeWebView-Swift.h>
#endif

#endif /* DatadogSDKReactNativeWebViewSwiftBridge_h */
