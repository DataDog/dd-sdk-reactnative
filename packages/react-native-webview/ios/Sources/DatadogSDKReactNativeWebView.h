/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// This file is imported in the auto-generated DatadogSDKReactNative-Swift.h header file.
// Deleting it could result in iOS builds failing.

#import "RCTDatadogWebView.h"
#import "RCTDatadogWebViewManager.h"
// react-native-webview is a static library under CocoaPods' default linkage, where its public
// headers land flat in Pods/Headers/Public and resolve as a quoted import. When the pod is built
// as a dynamic framework instead -- which is mandatory when the native Datadog iOS SDK is resolved
// through Swift Package Manager --the same header is only reachable
// as <react_native_webview/RNCWebViewImpl.h>. Support both layouts.
#if __has_include(<react_native_webview/RNCWebViewImpl.h>)
#import <react_native_webview/RNCWebViewImpl.h>
#else
#import "RNCWebViewImpl.h"
#endif
