/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import "DatadogSDKReactNativeWebViewSwiftBridge.h"
#import "RCTDatadogWebViewTrackingWrapper.h"

@implementation RCTDatadogWebViewTrackingWrapper {
    RCTDatadogWebViewTracking *_tracking;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _tracking = [[RCTDatadogWebViewTracking alloc] init];
    }
    return self;
}

- (void)enableWithWebView:(id<RCTDatadogTrackableWebView>)webView
             allowedHosts:(NSSet<NSString *> *)allowedHosts {
    [_tracking enableWithWebView:webView allowedHosts:allowedHosts];
}

@end
