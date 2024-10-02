/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <react-native-webview/RNCWebViewImpl.h>

@class RCTDatadogWebView;

@protocol RCTDatadogWebViewDelegate <NSObject>
- (void)didCreateWebView:(RCTDatadogWebView *)webView;
@end

@interface RCTDatadogWebView : RNCWebViewImpl

@property (nonatomic, weak) id<RCTDatadogWebViewDelegate> ddWebViewDelegate;
@property (nonatomic, assign) BOOL isTrackingEnabled;

- (WKWebView*) getWKWebView;
@end
