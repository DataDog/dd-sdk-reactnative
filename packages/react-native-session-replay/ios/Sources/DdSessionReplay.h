/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
@class DdSessionReplayImplementation;

#ifdef RCT_NEW_ARCH_ENABLED

#import <DdSDKReactNativeSessionReplay/DdSDKReactNativeSessionReplay.h>
@interface DdSessionReplay: NSObject <NativeDdSessionReplaySpec>

#else

#import <React/RCTBridgeModule.h>
@interface DdSessionReplay : NSObject <RCTBridgeModule>

#endif

@property (nonatomic, strong) DdSessionReplayImplementation* ddSessionReplayImplementation;

@end
