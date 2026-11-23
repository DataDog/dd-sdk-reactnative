// swift-tools-version: 6.0
/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import PackageDescription

// Swift Package Manager support for React Native's SwiftPM integration (`npx react-native spm`,
// React Native >= 0.88). Apps that use CocoaPods are unaffected: they use
// DatadogSDKReactNativeSessionReplay.podspec.
//
// Unlike the core package, this manifest sits at the package root rather than in ios/, because the
// Swift target ships assets/assets.{json,bin} and SwiftPM resources must live inside the target.
//
// React Native's autolinker references this package through a symlink at
// <app>/build/generated/autolinking/libs/DatadogSDKReactNativeSessionReplay, and SwiftPM resolves
// the relative package paths below against that symlink, not against node_modules. The core
// package sits next to it, at libs/DatadogSDKReactNative.
//
// SwiftPM cannot compile Swift and Objective-C in one target, and the Swift code calls into
// Objective-C and the other way around, so the sources are split in three:
// - DatadogSDKReactNativeSessionReplayText: the Objective-C++ text extraction wrappers, which the
//   Swift code uses.
// - DatadogSDKReactNativeSessionReplay: the Swift sources. It keeps the CocoaPods module name.
// - DatadogSDKReactNativeSessionReplayBridge: the React Native module and the privacy view, which
//   call into the Swift target. Only its Objective-C (.m) files import the Swift target, as a module
//   (see DatadogSDKReactNativeSessionReplaySwiftBridge.h): Objective-C++ cannot import a Swift
//   module, so its .mm files go through DdPrivacyOverriderWrapper.

// /!\ Keep this version in sync with DatadogSDKReactNativeSessionReplay.podspec.
let datadogIOSVersion: Version = "3.21.0"

let reactHeaders: [Target.Dependency] = [
    .product(name: "ReactHeaders", package: "ReactNative"),
    .product(name: "ReactNativeHeaders", package: "ReactNative"),
    .product(name: "ReactNativeDependenciesHeaders", package: "ReactNative"),
    .product(name: "ReactAppHeaders", package: "React-GeneratedCode"),
]

// Relative to ios/, the path of the Objective-C targets.
let textSources = [
    "Sources/RCTFabricWrapper.mm",
    "Sources/RCTTextExtractor.mm",
    "Sources/RCTTextPropertiesWrapper.mm",
]

let bridgeSources = [
    "Sources/DdPrivacyOverriderWrapper.m",
    "Sources/DdPrivacyViewFabric.mm",
    "Sources/DdPrivacyViewPaper.m",
    "Sources/DdSessionReplay.m",
    "Sources/DdSessionReplay+TurboModule.mm",
]

let headers = [
    "Sources/DatadogSDKReactNativeSessionReplay.h",
    "Sources/DatadogSDKReactNativeSessionReplaySwiftBridge.h",
    "Sources/DdPrivacyOverriderWrapper.h",
    "Sources/DdPrivacyViewFabric.h",
    "Sources/DdSessionReplay.h",
    "Sources/RCTFabricWrapper.h",
    "Sources/RCTTextExtractor.h",
    "Sources/RCTTextPropertiesWrapper.h",
]

// The Swift target's path is the package root, so that it contains assets/.
let objectiveCFiles = (textSources + bridgeSources + headers).map { "ios/" + $0 }

// SwiftPM apps always use the new architecture, on React Native 0.87 or later. The sources only
// compare RCT_VERSION_MINOR against older versions, so any SwiftPM-capable version gives the same
// result.
let reactDefines: [CXXSetting] = [
    .define("RCT_NEW_ARCH_ENABLED", to: "1"),
    .define("RCT_VERSION_MAJOR", to: "0"),
    .define("RCT_VERSION_MINOR", to: "88"),
    // Match the C++ ABI of the prebuilt React framework.
    .define("DEBUG", .when(configuration: .debug)),
    .define("NDEBUG", .when(configuration: .release)),
]

let newArchitecture: [CSetting] = [
    .define("RCT_NEW_ARCH_ENABLED", to: "1"),
    // See DatadogSDKReactNativeSessionReplaySwiftBridge.h.
    .define("DD_RN_SWIFTPM_SESSION_REPLAY"),
]

let package = Package(
    name: "DatadogSDKReactNativeSessionReplay",
    // React Native's SwiftPM integration supports iOS 15.1 and later.
    platforms: [.iOS("15.1")],
    products: [
        .library(
            name: "DatadogSDKReactNativeSessionReplay",
            targets: [
                "DatadogSDKReactNativeSessionReplayText",
                "DatadogSDKReactNativeSessionReplay",
                "DatadogSDKReactNativeSessionReplayBridge",
            ]
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
            name: "DatadogSDKReactNativeSessionReplayText",
            dependencies: reactHeaders,
            path: "ios",
            sources: textSources,
            // Holds a module map that exposes only the three wrapper headers to Swift.
            publicHeadersPath: "SwiftPM/DatadogSDKReactNativeSessionReplayText",
            cxxSettings: reactDefines,
            linkerSettings: [.linkedFramework("UIKit")]
        ),
        .target(
            name: "DatadogSDKReactNativeSessionReplay",
            dependencies: reactHeaders + [
                "DatadogSDKReactNativeSessionReplayText",
                .product(name: "DatadogSDKReactNative", package: "DatadogSDKReactNative"),
                .product(name: "DatadogSessionReplay", package: "dd-sdk-ios"),
            ],
            path: ".",
            exclude: objectiveCFiles,
            sources: ["ios/Sources"],
            resources: [
                .copy("assets/assets.json"),
                .copy("assets/assets.bin"),
            ]
        ),
        .target(
            name: "DatadogSDKReactNativeSessionReplayBridge",
            dependencies: reactHeaders + ["DatadogSDKReactNativeSessionReplay"],
            path: "ios",
            sources: bridgeSources,
            publicHeadersPath: "Sources",
            cSettings: newArchitecture,
            cxxSettings: reactDefines,
            linkerSettings: [.linkedFramework("UIKit")]
        ),
    ],
    // The sources are written for Swift 5, as CocoaPods compiles them.
    swiftLanguageModes: [.v5],
    cxxLanguageStandard: .cxx20
)
