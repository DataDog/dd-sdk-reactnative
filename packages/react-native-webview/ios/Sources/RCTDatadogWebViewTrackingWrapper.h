/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
#import "RCTDatadogTrackableWebView.h"

NS_ASSUME_NONNULL_BEGIN

// Wraps the Swift RCTDatadogWebViewTracking for RCTDatadogWebViewManager.mm. The manager is
// Objective-C++ because react-native-webview's headers only build in C++, and under Swift Package
// Manager Objective-C++ cannot import the Swift sources (see
// DatadogSDKReactNativeWebViewSwiftBridge.h).
@interface RCTDatadogWebViewTrackingWrapper : NSObject

- (void)enableWithWebView:(id<RCTDatadogTrackableWebView>)webView
             allowedHosts:(NSSet<NSString *> *)allowedHosts;

@end

NS_ASSUME_NONNULL_END
