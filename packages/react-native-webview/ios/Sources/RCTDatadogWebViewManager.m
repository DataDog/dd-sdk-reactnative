/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
#import <DatadogSDKReactNative/DatadogSDKReactNative-umbrella.h>
#import "RCTDatadogWebViewManager.h"
#import "RCTDatadogWebView.h"
#import "DatadogSDKReactNativeWebView-Swift.h"

@interface RCTDatadogWebViewManager () <RNCWebViewDelegate, RCTDatadogWebViewDelegate>
    @property (nonatomic, strong) NSMutableSet *allowedHosts;
@property (nonatomic, strong) RCTDatadogWebViewTracking* webViewTracking;
@end

@implementation RCTDatadogWebViewManager { }

// The module is exported to React Native with the name defined here.
RCT_EXPORT_MODULE(DdReactNativeWebView)

// Allowed Hosts (REQUIRED)
RCT_CUSTOM_VIEW_PROPERTY(allowedHosts, NSArray, RCTDatadogWebView)
{
    NSArray* allowedHosts = [RCTConvert NSArray:json];
    [self setupDatadogWebView:allowedHosts view:view];
}

// MARK: - Initialization
- (instancetype)init
{
    self = [super init];
    if (self) {
        self.allowedHosts = [[NSMutableSet alloc] init];
        self.webViewTracking = [[RCTDatadogWebViewTracking alloc] init];
    }
    return self;
}

// MARK: - View Manager
- (UIView *)view
{
    RCTDatadogWebView *rctWebView = [RCTDatadogWebView new];
    rctWebView.delegate = self;
    rctWebView.ddWebViewDelegate = self;
    rctWebView.javaScriptEnabled = true;
    return rctWebView;
}

// MARK: - Datadog Setup

/**
 * Setups the Datadog WebView by setting the allowed hosts and enabling tracking.
 *
 * @param allowedHosts The list of allowed hosts
 * @param view The RCTDatadogWebView as returned by the ViewManager
 */
- (void)setupDatadogWebView:(NSArray *)allowedHosts view:(RCTDatadogWebView*)view {
    [self.allowedHosts removeAllObjects];
    for (NSObject* obj in allowedHosts) {
        if (![obj isKindOfClass:[NSString class]]) {
            continue;
        }
        [self.allowedHosts addObject:obj];
    }
    
    [self.webViewTracking enableWithWebView:view allowedHosts:self.allowedHosts];
}

// MARK: - RCTDatadogWebViewDelegate
- (void)didCreateWebView:(RCTDatadogWebView *)webView {
    if (self.allowedHosts.count == 0) {
        return;
    }
    [self.webViewTracking enableWithWebView:webView allowedHosts:self.allowedHosts];
}

// MARK: - WKWebViewDelegate
- (BOOL)webView:(nonnull RNCWebViewImpl *)webView shouldStartLoadForRequest:(nonnull NSMutableDictionary<NSString *,id> *)request withCallback:(nonnull RCTDirectEventBlock)callback {
    return true;
}

@end
