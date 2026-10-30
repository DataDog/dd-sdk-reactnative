/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
@class DdProfilingImplementation;

#ifdef RCT_NEW_ARCH_ENABLED

#import <DdSDKReactNativeProfiling/DdSDKReactNativeProfiling.h>
@interface DdProfiling: NSObject <NativeDdProfilingSpec>

#else

#import <React/RCTBridgeModule.h>
@interface DdProfiling : NSObject <RCTBridgeModule>

#endif

@property (nonatomic, strong) DdProfilingImplementation* ddProfilingImplementation;

@end
