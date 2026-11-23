// swift-tools-version: 6.0
/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import PackageDescription

// Swift Package Manager support for React Native's SwiftPM integration (`npx react-native spm`,
// React Native >= 0.88). Apps that use CocoaPods are unaffected: they use
// DatadogSDKReactNativeWebView.podspec.
//
// React Native's autolinker references this package through a symlink at
// <app>/build/generated/autolinking/libs/DatadogSDKReactNativeWebView, and SwiftPM resolves the
// relative package paths below against that symlink, not against node_modules. The core package
// sits next to it, at libs/DatadogSDKReactNative.
//
// react-native-webview ships no Package.swift: apps generate one with `npx react-native spm
// scaffold`, which names the package and its product after the pod, `react-native-webview`, and
// the autolinker puts it at libs/react-native-webview. The scaffolded manifest declares the app's
// deployment target, and SwiftPM requires this package to declare at least the same, so an app
// that targets a later iOS version than the one below fails to resolve this package.
//
// SwiftPM cannot compile Swift and Objective-C in one target, and the Swift code calls into
// Objective-C and the other way around, so the sources are split in three:
// - DatadogSDKReactNativeWebViewView: RCTDatadogWebView, the RNCWebViewImpl subclass that the
//   Swift code tracks. Swift sees it only through the RCTDatadogTrackableWebView protocol.
// - DatadogSDKReactNativeWebView: the Swift sources. It keeps the CocoaPods module name.
// - DatadogSDKReactNativeWebViewBridge: the React Native view manager, which calls into the Swift
//   target. It is Objective-C++, because react-native-webview's headers only build in C++, and
//   Objective-C++ cannot import a Swift module, so it goes through RCTDatadogWebViewTrackingWrapper,
//   which is Objective-C (see DatadogSDKReactNativeWebViewSwiftBridge.h).

// /!\ Keep this version in sync with DatadogSDKReactNativeWebView.podspec.
let datadogIOSVersion: Version = "3.21.0"

let reactHeaders: [Target.Dependency] = [
    .product(name: "ReactHeaders", package: "ReactNative"),
    .product(name: "ReactNativeHeaders", package: "ReactNative"),
    .product(name: "ReactNativeDependenciesHeaders", package: "ReactNative"),
    .product(name: "ReactAppHeaders", package: "React-GeneratedCode"),
]

let webView: Target.Dependency = .product(name: "react-native-webview", package: "react-native-webview")

let viewSources = ["Sources/RCTDatadogWebView.mm"]

let bridgeSources = [
    "Sources/RCTDatadogWebViewManager.mm",
    "Sources/RCTDatadogWebViewTrackingWrapper.m",
]

let headers = [
    "Sources/DatadogSDKReactNativeWebView.h",
    "Sources/DatadogSDKReactNativeWebViewSwiftBridge.h",
    "Sources/RCTDatadogTrackableWebView.h",
    "Sources/RCTDatadogWebView.h",
    "Sources/RCTDatadogWebViewManager.h",
    "Sources/RCTDatadogWebViewTrackingWrapper.h",
]

let reactDefines: [CXXSetting] = [
    // SwiftPM apps always use the new architecture.
    .define("RCT_NEW_ARCH_ENABLED", to: "1"),
    // Match the C++ ABI of the prebuilt React framework.
    .define("DEBUG", .when(configuration: .debug)),
    .define("NDEBUG", .when(configuration: .release)),
]

let package = Package(
    name: "DatadogSDKReactNativeWebView",
    // React Native's SwiftPM integration supports iOS 15.1 and later.
    platforms: [.iOS("15.1")],
    products: [
        .library(
            name: "DatadogSDKReactNativeWebView",
            targets: [
                "DatadogSDKReactNativeWebViewView",
                "DatadogSDKReactNativeWebView",
                "DatadogSDKReactNativeWebViewBridge",
            ]
        ),
    ],
    dependencies: [
        .package(name: "ReactNative", path: "../../../../xcframeworks"),
        .package(name: "React-GeneratedCode", path: "../../../ios"),
        .package(name: "DatadogSDKReactNative", path: "../DatadogSDKReactNative"),
        .package(name: "react-native-webview", path: "../react-native-webview"),
        .package(url: "https://github.com/DataDog/dd-sdk-ios.git", exact: datadogIOSVersion),
    ],
    targets: [
        .target(
            name: "DatadogSDKReactNativeWebViewView",
            dependencies: reactHeaders + [webView],
            path: ".",
            sources: viewSources,
            // Holds a module map that exposes only RCTDatadogTrackableWebView.h to Swift.
            publicHeadersPath: "SwiftPM/DatadogSDKReactNativeWebViewView",
            cxxSettings: reactDefines,
            linkerSettings: [.linkedFramework("WebKit")]
        ),
        .target(
            name: "DatadogSDKReactNativeWebView",
            dependencies: reactHeaders + [
                "DatadogSDKReactNativeWebViewView",
                .product(name: "DatadogSDKReactNative", package: "DatadogSDKReactNative"),
                .product(name: "DatadogWebViewTracking", package: "dd-sdk-ios"),
            ],
            path: ".",
            exclude: viewSources + bridgeSources + headers,
            sources: ["Sources"]
        ),
        .target(
            name: "DatadogSDKReactNativeWebViewBridge",
            dependencies: reactHeaders + [webView, "DatadogSDKReactNativeWebView"],
            path: ".",
            sources: bridgeSources,
            publicHeadersPath: "Sources",
            cSettings: [
                .define("RCT_NEW_ARCH_ENABLED", to: "1"),
                // See DatadogSDKReactNativeWebViewSwiftBridge.h.
                .define("DD_RN_SWIFTPM_WEBVIEW"),
            ],
            cxxSettings: reactDefines,
            linkerSettings: [.linkedFramework("WebKit")]
        ),
    ],
    // The sources are written for Swift 5, as CocoaPods compiles them.
    swiftLanguageModes: [.v5],
    cxxLanguageStandard: .cxx20
)
