// swift-tools-version: 6.0
/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import PackageDescription

// Swift Package Manager support for React Native's SwiftPM integration (`npx react-native spm`,
// React Native >= 0.88). Apps that use CocoaPods are unaffected: they use
// DatadogInternalTesting.podspec.
//
// React Native's autolinker references this package through a symlink at
// <app>/build/generated/autolinking/libs/DatadogInternalTesting, and SwiftPM resolves the relative
// package paths below against that symlink, not against node_modules. The core package sits next
// to it, at libs/DatadogSDKReactNative.
//
// SwiftPM cannot compile Swift and Objective-C++ in one target, so the sources are split in two:
// - DatadogInternalTesting: the Swift sources. It keeps the CocoaPods module name.
// - DatadogInternalTestingBridge: the React Native module, which calls into the Swift target. It is
//   an Objective-C file, which imports the Swift target as a module (see
//   DatadogInternalTestingSwiftBridge.h), plus a small Objective-C++ file for its TurboModule part.
//   Objective-C++ cannot import a Swift module.

// /!\ Keep this version in sync with DatadogInternalTesting.podspec.
let datadogIOSVersion: Version = "3.21.0"

let reactHeaders: [Target.Dependency] = [
    .product(name: "ReactHeaders", package: "ReactNative"),
    .product(name: "ReactNativeHeaders", package: "ReactNative"),
    .product(name: "ReactNativeDependenciesHeaders", package: "ReactNative"),
    .product(name: "ReactAppHeaders", package: "React-GeneratedCode"),
]

let bridgeSources = ["DdInternalTesting.m", "DdInternalTesting+TurboModule.mm"]

let bridgeHeaders = [
    "DatadogInternalTesting.h",
    "DatadogInternalTestingSwiftBridge.h",
    "DdInternalTesting.h",
]

let package = Package(
    name: "DatadogInternalTesting",
    // React Native's SwiftPM integration supports iOS 15.1 and later.
    platforms: [.iOS("15.1")],
    products: [
        .library(
            name: "DatadogInternalTesting",
            targets: ["DatadogInternalTesting", "DatadogInternalTestingBridge"]
        ),
    ],
    dependencies: [
        .package(name: "ReactNative", path: "../../../../xcframeworks"),
        .package(name: "React-GeneratedCode", path: "../../../ios"),
        .package(name: "DatadogSDKReactNative", path: "../DatadogSDKReactNative"),
        .package(url: "https://github.com/DataDog/dd-sdk-ios.git", exact: datadogIOSVersion),
    ],
    targets: [
        .target(
            name: "DatadogInternalTesting",
            dependencies: reactHeaders + [
                .product(name: "DatadogSDKReactNative", package: "DatadogSDKReactNative"),
                .product(name: "DatadogCore", package: "dd-sdk-ios"),
            ],
            path: "Sources",
            exclude: bridgeSources + bridgeHeaders
        ),
        .target(
            name: "DatadogInternalTestingBridge",
            dependencies: reactHeaders + ["DatadogInternalTesting"],
            path: "Sources",
            sources: bridgeSources,
            publicHeadersPath: ".",
            // SwiftPM apps always use the new architecture.
            cSettings: [
                .define("RCT_NEW_ARCH_ENABLED", to: "1"),
                // See DatadogInternalTestingSwiftBridge.h.
                .define("DD_RN_SWIFTPM_INTERNAL_TESTING"),
            ],
            cxxSettings: [
                .define("RCT_NEW_ARCH_ENABLED", to: "1"),
                // Match the C++ ABI of the prebuilt React framework.
                .define("DEBUG", .when(configuration: .debug)),
                .define("NDEBUG", .when(configuration: .release)),
            ]
        ),
    ],
    // The sources are written for Swift 5, as CocoaPods compiles them.
    swiftLanguageModes: [.v5],
    cxxLanguageStandard: .cxx20
)
