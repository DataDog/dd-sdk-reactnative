/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
#import <Foundation/Foundation.h>
#import <React/RCTBridge.h>
#import <React/RCTUtils.h>

@class DatadogWebViewLegacy;

#ifdef RCT_NEW_ARCH_ENABLED

#import <DdSdkReactNativeWebView/DdSdkReactNativeWebView.h>
@interface DatadogWebViewLegacy : NSObject <NativeDdWebViewLegacySpec>

#else

#import <React/RCTBridgeModule.h>
@interface DatadogWebViewLegacy : NSObject <RCTBridgeModule>

#endif

@end
