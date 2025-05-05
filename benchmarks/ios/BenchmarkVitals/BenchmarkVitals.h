/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
@class BenchmarkVitalsImplementation;

#ifdef RCT_NEW_ARCH_ENABLED
#import "BenchmarkVitalsSpec.h"
@interface BenchmarkVitals: NSObject <NativeBenchmarkVitalsSpec>

#else

#import <React/RCTBridgeModule.h>
@interface BenchmarkVitals : NSObject <RCTBridgeModule>

#endif

@property (nonatomic, strong) BenchmarkVitalsImplementation* benchmarkVitalsImplementation;

@end
