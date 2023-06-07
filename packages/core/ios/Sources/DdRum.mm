/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
// Import this first to prevent require cycles
#import <DatadogSDKReactNative-Swift.h>
#import "DdRum.h"


@implementation DdRum

RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(startView, withKey:(NSString*)key
                 withName:(NSString*)name
                 withContext:(NSDictionary*)context
                 withTimestampms:(NSNumber*)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self startView:key name:name context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(stopView, withKey:(NSString*)key
                 withContext:(NSDictionary*)context
                 withTimestampms:(NSNumber*)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self stopView:key context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(startAction, startWithType:(NSString*)type
                 withName:(NSString*)name
                 withContext:(NSDictionary*)context
                 withTimestampms:(NSNumber*)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self startAction:type name:name context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(stopAction, stopWithType:(NSString*)type
                 withName:(NSString*)name
                 withContext:(NSDictionary*)context
                 withTimestampms:(NSNumber*)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self stopAction:type name:name context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(addAction, addWithType:(NSString*)type
                 withName:(NSString*)name
                 withContext:(NSDictionary*)context
                 withTimestampms:(NSNumber*)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self addAction:type name:name context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(startResource, withKey:(NSString*)key
                 withMethod:(NSString*)method
                 withUrl:(NSString*)url
                 withContext:(NSDictionary*)context
                 withTimestampms:(NSNumber*)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self startResource:key method:method url:url context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(stopResource, withKey:(NSString*)key
                 withStatuscode:(double)statusCode
                 withKind:(NSString*)kind
                 withSize:(NSNumber*)size
                 withContext:(NSDictionary*)context
                 withTimestampms:(NSNumber*)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self stopResource:key statusCode:statusCode kind:kind size:size context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(addError, withMessage:(NSString*)message
                 withSource:(NSString*)source
                 withStacktrace:(NSString*)stacktrace
                 withContext:(NSDictionary*)context
                 withTimestampms:(NSNumber*)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self addError:message source:source stacktrace:stacktrace context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(addTiming, withName:(NSString*)name
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self addTiming:name resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(stopSession, withResolve:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self stopSession:resolve reject:reject];
}

RCT_REMAP_METHOD(addFeatureFlagEvaluation, withName:(NSString*)name
                 withValue:(NSDictionary*)value
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self addFeatureFlagEvaluation:name value:value resolve:resolve reject:reject];
}

// Thanks to this guard, we won't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDdRumSpecJSI>(params);
}
#endif

- (DdRumImplementation*)ddRumImplementation
{
    if (_ddRumImplementation == nil) {
        _ddRumImplementation = [[DdRumImplementation alloc] init];
    }
    return _ddRumImplementation;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (dispatch_queue_t)methodQueue {
    return [RNQueue getSharedQueue];
}

- (void)addAction:(NSString *)type name:(NSString *)name context:(NSDictionary *)context timestampMs:(NSNumber *)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation addActionWithType:type name:name context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void)addError:(NSString *)message source:(NSString *)source stacktrace:(NSString *)stacktrace context:(NSDictionary *)context timestampMs:(NSNumber *)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation addErrorWithMessage:message source:source stacktrace:stacktrace context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void)addFeatureFlagEvaluation:(NSString *)name value:(NSDictionary *)value resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation addFeatureFlagEvaluationWithName:name value:value resolve:resolve reject:reject];
}

- (void)addTiming:(NSString *)name resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation addTimingWithName:name resolve:resolve reject:reject];
}

- (void)startAction:(NSString *)type name:(NSString *)name context:(NSDictionary *)context timestampMs:(NSNumber *)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation startActionWithType:type name:name context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void)startResource:(NSString *)key method:(NSString *)method url:(NSString *)url context:(NSDictionary *)context timestampMs:(NSNumber *)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation startResourceWithKey:key method:method url:url context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void)startView:(NSString *)key name:(NSString *)name context:(NSDictionary *)context timestampMs:(NSNumber *)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation startViewWithKey:key name:name context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void)stopAction:(NSString *)type name:(NSString *)name context:(NSDictionary *)context timestampMs:(NSNumber *)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation stopActionWithType:type name:name context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void)stopResource:(NSString *)key statusCode:(double)statusCode kind:(NSString *)kind size:(NSNumber *)size context:(NSDictionary *)context timestampMs:(NSNumber *)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation stopResourceWithKey:key statusCode:statusCode kind:kind size:size context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void)stopSession:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation stopSessionWithResolve:resolve reject:reject];
}

- (void)stopView:(NSString *)key context:(NSDictionary *)context timestampMs:(NSNumber *)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation stopViewWithKey:key context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

@end
