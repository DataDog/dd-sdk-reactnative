/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Imports the Objective-C interface of the Swift sources (DdSdkImplementation, DdRumImplementation,
// ...). Where it comes from depends on the build system:
// - CocoaPods compiles Swift and Objective-C into one pod, and generates DatadogSDKReactNative-Swift.h.
// - Swift Package Manager cannot mix languages in one target, so the Swift sources are a separate
//   module, which is only reachable as a module.
//
// Only Objective-C (.m) files may include this header: `@import` is rejected in Objective-C++, and
// React Native's headers do not build as C++ modules. This is why the React Native modules are
// written in Objective-C, with only their TurboModule part in Objective-C++.

#ifndef DatadogSDKReactNativeSwiftBridge_h
#define DatadogSDKReactNativeSwiftBridge_h

// DD_RN_SWIFTPM_CORE is set by Package.swift for this package's own target only. React Native's
// SwiftPM autolinking also copies this header into a header tree shared by every library, where
// other targets may parse it: there, none of the branches below applies and it imports nothing.
#if DD_RN_SWIFTPM_CORE
@import DatadogSDKReactNative;
#elif __has_include("DatadogSDKReactNative-Swift.h")
#import <DatadogSDKReactNative-Swift.h>
#elif __has_include(<DatadogSDKReactNative/DatadogSDKReactNative-Swift.h>)
#import <DatadogSDKReactNative/DatadogSDKReactNative-Swift.h>
#endif

#endif /* DatadogSDKReactNativeSwiftBridge_h */
