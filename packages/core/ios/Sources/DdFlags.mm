/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Import this first to prevent require cycles
#if __has_include("DatadogSDKReactNative-Swift.h")
#import <DatadogSDKReactNative-Swift.h>
#else
#import <DatadogSDKReactNative/DatadogSDKReactNative-Swift.h>
#endif
#import "DdFlags.h"


@implementation DdFlags

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(enable:(NSDictionary *)configuration
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self enable:configuration resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(setEvaluationContext:(NSString *)clientName
                  targetingKey:(NSString *)targetingKey
                  attributes:(NSDictionary *)attributes
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self setEvaluationContext:clientName targetingKey:targetingKey attributes:attributes resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(trackEvaluation:(NSString *)clientName
                  withKey:(NSString *)key
                  withRawFlag:(NSDictionary *)rawFlag
                  targetingKey:(NSString *)targetingKey
                  attributes:(NSDictionary *)attributes
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self trackEvaluation:clientName key:key rawFlag:rawFlag targetingKey:targetingKey attributes:attributes resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(trackExposure:(NSString *)clientName
                  withKey:(NSString *)key
                  withRawFlag:(NSDictionary *)rawFlag
                  targetingKey:(NSString *)targetingKey
                  attributes:(NSDictionary *)attributes
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self trackExposure:clientName key:key rawFlag:rawFlag targetingKey:targetingKey attributes:attributes resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(trackEvaluationEvent:(NSString *)clientName
                  withKey:(NSString *)key
                  withRawFlag:(nullable NSDictionary *)rawFlag
                  targetingKey:(NSString *)targetingKey
                  attributes:(NSDictionary *)attributes
                  errorCode:(nullable NSString *)errorCode
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self trackEvaluationEvent:clientName key:key rawFlag:rawFlag targetingKey:targetingKey attributes:attributes errorCode:errorCode resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(trackRumEvaluation:(NSString *)clientName
                  withKey:(NSString *)key
                  variant:(NSString *)variant
                  targetingKey:(NSString *)targetingKey
                  attributes:(NSDictionary *)attributes
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self trackRumEvaluation:clientName key:key variant:variant targetingKey:targetingKey attributes:attributes resolve:resolve reject:reject];
}

// Thanks to this guard, we won't compile this code when we build for the new architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDdFlagsSpecJSI>(params);
}
#endif

- (DdFlagsImplementation*)ddFlagsImplementation
{
    if (_ddFlagsImplementation == nil) {
        _ddFlagsImplementation = [[DdFlagsImplementation alloc] init];
    }
    return _ddFlagsImplementation;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (dispatch_queue_t)methodQueue {
    return [RNQueue getSharedQueue];
}

- (void)enable:(NSDictionary *)configuration resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddFlagsImplementation enable:configuration resolve:resolve reject:reject];
}

- (void)setEvaluationContext:(NSString *)clientName targetingKey:(NSString *)targetingKey attributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddFlagsImplementation setEvaluationContext:clientName targetingKey:targetingKey attributes:attributes resolve:resolve reject:reject];
}

- (void)trackEvaluation:(NSString *)clientName key:(NSString *)key rawFlag:(NSDictionary *)rawFlag targetingKey:(NSString *)targetingKey attributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddFlagsImplementation trackEvaluation:clientName key:key rawFlag:rawFlag targetingKey:targetingKey attributes:attributes resolve:resolve reject:reject];
}

- (void)trackExposure:(NSString *)clientName key:(NSString *)key rawFlag:(NSDictionary *)rawFlag targetingKey:(NSString *)targetingKey attributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddFlagsImplementation trackExposure:clientName key:key rawFlag:rawFlag targetingKey:targetingKey attributes:attributes resolve:resolve reject:reject];
}

- (void)trackEvaluationEvent:(NSString *)clientName key:(NSString *)key rawFlag:(NSDictionary * _Nullable)rawFlag targetingKey:(NSString *)targetingKey attributes:(NSDictionary *)attributes errorCode:(NSString * _Nullable)errorCode resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddFlagsImplementation trackEvaluationEvent:clientName key:key rawFlag:rawFlag targetingKey:targetingKey attributes:attributes errorCode:errorCode resolve:resolve reject:reject];
}

- (void)trackRumEvaluation:(NSString *)clientName key:(NSString *)key variant:(NSString *)variant targetingKey:(NSString *)targetingKey attributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddFlagsImplementation trackRumEvaluation:clientName key:key variant:variant targetingKey:targetingKey attributes:attributes resolve:resolve reject:reject];
}
@end
