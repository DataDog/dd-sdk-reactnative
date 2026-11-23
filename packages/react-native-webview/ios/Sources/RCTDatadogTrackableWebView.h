/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
#import <WebKit/WebKit.h>

// What RCTDatadogWebViewTracking needs from RCTDatadogWebView. The Swift code depends on this
// protocol rather than on RCTDatadogWebView, whose header imports react-native-webview and React:
// under Swift Package Manager those headers cannot be imported into Swift.
@protocol RCTDatadogTrackableWebView <NSObject>

@property(nonatomic, assign) BOOL isTrackingEnabled;

- (WKWebView *)getWKWebView;

@end
