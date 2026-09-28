/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
#ifdef RCT_NEW_ARCH_ENABLED
#import "BenchmarkVitalsSpec.h"
@interface FlagsBenchmark : NSObject <NativeFlagsBenchmarkSpec>
#else
#import <React/RCTBridgeModule.h>
@interface FlagsBenchmark : NSObject <RCTBridgeModule>
#endif
@end
