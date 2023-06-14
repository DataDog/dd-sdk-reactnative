/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
@class DdRumImplementation;

#ifdef RCT_NEW_ARCH_ENABLED

#import <DdSdkReactNative/DdSdkReactNative.h>
@interface DdRum: NSObject <NativeDdRumSpec>

#else

#import <React/RCTBridgeModule.h>
@interface DdRum : NSObject <RCTBridgeModule>

#endif

@property (nonatomic, strong) DdRumImplementation* ddRumImplementation;

@end
