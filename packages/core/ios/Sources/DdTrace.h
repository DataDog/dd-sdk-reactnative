/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@class DdTraceImplementation;

// This header must stay importable from Objective-C and Swift, so it does not import the C++
// TurboModule spec. DdTrace+TurboModule.mm adopts NativeDdTraceSpec; the methods below are the
// spec's methods, declared here so that the compiler checks that DdTrace implements them.
@interface DdTrace : NSObject <RCTBridgeModule>

@property (nonatomic, strong) DdTraceImplementation* ddTraceImplementation;

- (void)startSpan:(NSString *)operation context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)finishSpan:(NSString *)spanId context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;

@end
