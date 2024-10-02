/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import "RCTDatadogWebView.h"
#import <WebKit/WKUIDelegate.h>

@interface RCTDatadogWebView () <WKUIDelegate>
@end

@implementation RCTDatadogWebView { }

- (instancetype)init
{
    self = [super init];
    if (self) {
        _isTrackingEnabled = false;
    }
    return self;
}

- (WKWebView *)getWKWebView {
    return [self findWKWebViewInView: self];
}

- (WKWebView *)findWKWebViewInView:(UIView *)view {
    // Check if the current view is a WKWebView
    if ([view isKindOfClass:[WKWebView class]]) {
        return (WKWebView *)view;
    }
    
    // Iterate through the subviews recursively
    for (UIView *subview in view.subviews) {
        WKWebView *webView = [self findWKWebViewInView:subview];
        if (webView) {
            return webView; // Return the first WKWebView found
        }
    }
    
    return nil;
}

- (void)didMoveToWindow {
    [super didMoveToWindow];

    if (self.ddWebViewDelegate != nil && [self.ddWebViewDelegate respondsToSelector:@selector(didCreateWebView:)]) {
        [self.ddWebViewDelegate didCreateWebView:self];
    }
}

@end
