/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
@class DdInternalTestingImplementation;

#ifdef RCT_NEW_ARCH_ENABLED

#import <DdInternalTesting/DdInternalTesting.h>
@interface DdInternalTesting: NSObject <NativeDdInternalTestingSpec>

#else

#import <React/RCTBridgeModule.h>
@interface DdInternalTesting : NSObject <RCTBridgeModule>

#endif

@property (nonatomic, strong) DdInternalTestingImplementation* ddInternalTestingImplementation;

@end
