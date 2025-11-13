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

RCT_REMAP_METHOD(setEvaluationContext,
                 withClientName:(NSString *)clientName
                 withTargetingKey:(NSString *)targetingKey
                 withAttributes:(NSDictionary *)attributes
                 withResolve:(RCTPromiseResolveBlock)resolve
                 withReject:(RCTPromiseRejectBlock)reject)
{
    [self setEvaluationContext:clientName targetingKey:targetingKey attributes:attributes resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(getBooleanValue,
                 getBooleanValueWithClientName:(NSString *)clientName
                 withKey:(NSString *)key
                 withDefaultValue:(BOOL)defaultValue
                 withResolve:(RCTPromiseResolveBlock)resolve
                 withReject:(RCTPromiseRejectBlock)reject)
{
    [self getBooleanValue:clientName key:key defaultValue:defaultValue resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(getStringValue,
                 getStringValueWithClientName:(NSString *)clientName
                 withKey:(NSString *)key
                 withDefaultValue:(NSString *)defaultValue
                 withResolve:(RCTPromiseResolveBlock)resolve
                 withReject:(RCTPromiseRejectBlock)reject)
{
    [self getStringValue:clientName key:key defaultValue:defaultValue resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(getNumberValue,
                 getNumberValueWithClientName:(NSString *)clientName
                 withKey:(NSString *)key
                 withDefaultValue:(double)defaultValue
                 withResolve:(RCTPromiseResolveBlock)resolve
                 withReject:(RCTPromiseRejectBlock)reject)
{
    [self getNumberValue:clientName key:key defaultValue:defaultValue resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(getObjectValue,
                 getObjectValueWithClientName:(NSString *)clientName
                 withKey:(NSString *)key
                 withDefaultValue:(NSDictionary *)defaultValue
                 withResolve:(RCTPromiseResolveBlock)resolve
                 withReject:(RCTPromiseRejectBlock)reject)
{
    [self getObjectValue:clientName key:key defaultValue:defaultValue resolve:resolve reject:reject];
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

- (void)setEvaluationContext:(NSString *)clientName targetingKey:(NSString *)targetingKey attributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
    [self.ddFlagsImplementation setEvaluationContext:clientName targetingKey:targetingKey attributes:attributes resolve:resolve reject:reject];
}

- (void)getBooleanValue:(NSString *)clientName key:(NSString *)key defaultValue:(BOOL)defaultValue resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
    [self.ddFlagsImplementation getBooleanValue:clientName key:key defaultValue:defaultValue resolve:resolve reject:reject];
}

- (void)getStringValue:(NSString *)clientName key:(NSString *)key defaultValue:(NSString *)defaultValue resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
    [self.ddFlagsImplementation getStringValue:clientName key:key defaultValue:defaultValue resolve:resolve reject:reject];
}

- (void)getNumberValue:(NSString *)clientName key:(NSString *)key defaultValue:(double)defaultValue resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
    [self.ddFlagsImplementation getNumberValue:clientName key:key defaultValue:defaultValue resolve:resolve reject:reject];
}

- (void)getObjectValue:(NSString *)clientName key:(NSString *)key defaultValue:(NSDictionary *)defaultValue resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
    [self.ddFlagsImplementation getObjectValue:clientName key:key defaultValue:defaultValue resolve:resolve reject:reject];
}
@end
