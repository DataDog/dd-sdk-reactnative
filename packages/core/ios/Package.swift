// swift-tools-version: 6.0
/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import PackageDescription

// Swift Package Manager support for React Native's SwiftPM integration (`npx react-native spm`,
// React Native >= 0.88). Apps that use CocoaPods are unaffected: they use
// DatadogSDKReactNative.podspec.
//
// React Native's autolinker references this package through a symlink at
// <app>/build/generated/autolinking/libs/DatadogSDKReactNative, and SwiftPM resolves the relative
// package paths below against that symlink, not against node_modules.
//
// SwiftPM cannot compile Swift and Objective-C++ in one target, so the sources are split in two:
// - DatadogSDKReactNative: the Swift sources. It keeps the module name that the other Datadog
//   packages import.
// - DatadogSDKReactNativeBridge: the React Native modules. They call into the Swift target, which
//   never calls back into them. Each module is an Objective-C file, which imports the Swift target
//   as a module (see DatadogSDKReactNativeSwiftBridge.h), plus a small Objective-C++ file for its
//   TurboModule part. Objective-C++ cannot import a Swift module.
//
// Apps that initialize the SDK from a Swift app delegate import DatadogSDKReactNative and call
// DdSdkNativeInitialization().initializeFromNative(); with CocoaPods, that class is in the same
// module. DdSdk, which the Objective-C setup calls, is in the DatadogSDKReactNativeBridge module.

// /!\ Keep this version in sync with DatadogSDKReactNative.podspec.
let datadogIOSVersion: Version = "3.21.0"

let reactHeaders: [Target.Dependency] = [
    .product(name: "ReactHeaders", package: "ReactNative"),
    .product(name: "ReactNativeHeaders", package: "ReactNative"),
    .product(name: "ReactNativeDependenciesHeaders", package: "ReactNative"),
    .product(name: "ReactAppHeaders", package: "React-GeneratedCode"),
]

let bridgeModules = ["DdFlags", "DdLogs", "DdRum", "DdSdk", "DdTrace"]

let bridgeSources = bridgeModules.flatMap { ["\($0).m", "\($0)+TurboModule.mm"] }

let bridgeHeaders = bridgeModules.map { "\($0).h" } + [
    "DatadogSDKReactNative.h",
    "DatadogSDKReactNativeSwiftBridge.h",
]

// SwiftPM apps always use the new architecture.
let newArchitecture: [CSetting] = [
    .define("RCT_NEW_ARCH_ENABLED", to: "1"),
    // See DatadogSDKReactNativeSwiftBridge.h.
    .define("DD_RN_SWIFTPM_CORE"),
]

let package = Package(
    name: "DatadogSDKReactNative",
    // React Native's SwiftPM integration supports iOS 15.1 and later.
    platforms: [.iOS("15.1")],
    products: [
        .library(
            name: "DatadogSDKReactNative",
            targets: ["DatadogSDKReactNative", "DatadogSDKReactNativeBridge"]
        ),
    ],
    dependencies: [
        .package(name: "ReactNative", path: "../../../../xcframeworks"),
        .package(name: "React-GeneratedCode", path: "../../../ios"),
        .package(url: "https://github.com/DataDog/dd-sdk-ios.git", exact: datadogIOSVersion),
    ],
    targets: [
        .target(
            name: "DatadogSDKReactNative",
            dependencies: reactHeaders + [
                .product(name: "DatadogCore", package: "dd-sdk-ios"),
                .product(name: "DatadogLogs", package: "dd-sdk-ios"),
                .product(name: "DatadogTrace", package: "dd-sdk-ios"),
                .product(name: "DatadogRUM", package: "dd-sdk-ios"),
                .product(name: "DatadogCrashReporting", package: "dd-sdk-ios"),
                .product(name: "DatadogFlags", package: "dd-sdk-ios"),
                .product(
                    name: "DatadogWebViewTracking",
                    package: "dd-sdk-ios",
                    condition: .when(platforms: [.iOS])
                ),
            ],
            path: "Sources",
            exclude: bridgeSources + bridgeHeaders
        ),
        .target(
            name: "DatadogSDKReactNativeBridge",
            dependencies: reactHeaders + ["DatadogSDKReactNative"],
            path: "Sources",
            sources: bridgeSources,
            publicHeadersPath: ".",
            cSettings: newArchitecture,
            cxxSettings: [
                .define("RCT_NEW_ARCH_ENABLED", to: "1"),
                // Match the C++ ABI of the prebuilt React framework.
                .define("DEBUG", .when(configuration: .debug)),
                .define("NDEBUG", .when(configuration: .release)),
            ],
            linkerSettings: [
                .linkedFramework("UIKit"),
                .linkedFramework("Foundation"),
            ]
        ),
    ],
    // The sources are written for Swift 5, as CocoaPods compiles them.
    swiftLanguageModes: [.v5],
    cxxLanguageStandard: .cxx20
)
