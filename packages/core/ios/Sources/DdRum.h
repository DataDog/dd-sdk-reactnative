/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@class DdRumImplementation;

// This header must stay importable from Objective-C and Swift, so it does not import the C++
// TurboModule spec. DdRum+TurboModule.mm adopts NativeDdRumSpec; the methods below are the spec's
// methods, declared here so that the compiler checks that DdRum implements them.
@interface DdRum : NSObject <RCTBridgeModule>

@property (nonatomic, strong) DdRumImplementation* ddRumImplementation;

- (void)startView:(NSString *)key name:(NSString *)name context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)stopView:(NSString *)key context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)startAction:(NSString *)type name:(NSString *)name context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)stopAction:(NSString *)type name:(NSString *)name context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)addAction:(NSString *)type name:(NSString *)name touch:(nullable NSDictionary *)touch context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)startResource:(NSString *)key method:(NSString *)method url:(NSString *)url context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)stopResource:(NSString *)key statusCode:(double)statusCode kind:(NSString *)kind size:(double)size context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)addError:(NSString *)message source:(NSString *)source stacktrace:(NSString *)stacktrace context:(NSDictionary *)context timestampMs:(double)timestampMs fingerprint:(NSString *)fingerprint resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)addTiming:(NSString *)name resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)addViewAttribute:(NSString *)key value:(NSDictionary *)value resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)removeViewAttribute:(NSString *)key resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)addViewAttributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)removeViewAttributes:(NSArray *)keys resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)addViewLoadingTime:(BOOL)overwrite resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)reportAppFullyDisplayed:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)stopSession:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)addFeatureFlagEvaluation:(NSString *)name value:(NSDictionary *)value resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)getCurrentSessionId:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void) startFeatureOperation:(NSString *)name operationKey:(NSString *)operationKey attributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void) succeedFeatureOperation:(NSString *)name operationKey:(NSString *)operationKey attributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void) failFeatureOperation:(NSString *)name operationKey:(NSString *)operationKey reason:(NSString *)reason attributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;

@end
