/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
@class DdCoreTestsImplementation;

#ifdef RCT_NEW_ARCH_ENABLED

#import <DdSdkReactNative/DdSdkReactNative.h>
@interface DdCoreTests: NSObject <NativeDdCoreTestsSpec>

#else

#import <React/RCTBridgeModule.h>
@interface DdCoreTests : NSObject <RCTBridgeModule>

#endif

@property (nonatomic, strong) DdCoreTestsImplementation* ddCoreTestsImplementation;

@end
