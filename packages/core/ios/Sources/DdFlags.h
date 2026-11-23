/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@class DdFlagsImplementation;

// This header must stay importable from Objective-C and Swift, so it does not import the C++
// TurboModule spec. DdFlags+TurboModule.mm adopts NativeDdFlagsSpec; the methods below are the
// spec's methods, declared here so that the compiler checks that DdFlags implements them.
@interface DdFlags : NSObject <RCTBridgeModule>

@property (nonatomic, strong) DdFlagsImplementation* ddFlagsImplementation;

- (void)enable:(NSDictionary *)configuration resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)setEvaluationContext:(NSString *)clientName targetingKey:(NSString *)targetingKey attributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)trackEvaluation:(NSString *)clientName key:(NSString *)key rawFlag:(NSDictionary *)rawFlag targetingKey:(NSString *)targetingKey attributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;

@end
