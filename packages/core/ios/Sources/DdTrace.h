/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
@class DdTraceImplementation;

#ifdef RCT_NEW_ARCH_ENABLED

#import <DdSdkReactNative/DdSdkReactNative.h>
@interface DdTrace: NSObject <NativeDdTraceSpec>

#else

#import <React/RCTBridgeModule.h>
@interface DdTrace : NSObject <RCTBridgeModule>

#endif

@property (nonatomic, strong) DdTraceImplementation* ddTraceImplementation;

@end
