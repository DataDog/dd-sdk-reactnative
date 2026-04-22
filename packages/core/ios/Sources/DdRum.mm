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
#import "DdRum.h"


@implementation DdRum

@synthesize bridge = _bridge;
RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(startView, withKey:(NSString*)key
                 withName:(NSString*)name
                 withContext:(NSDictionary*)context
                 withTimestampms:(double)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self startView:key name:name context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(stopView, withKey:(NSString*)key
                 withContext:(NSDictionary*)context
                 withTimestampms:(double)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self stopView:key context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(startAction, startWithType:(NSString*)type
                 withName:(NSString*)name
                 withContext:(NSDictionary*)context
                 withTimestampms:(double)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self startAction:type name:name context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(stopAction, stopWithType:(NSString*)type
                 withName:(NSString*)name
                 withContext:(NSDictionary*)context
                 withTimestampms:(double)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self stopAction:type name:name context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(addAction, addWithType:(NSString*)type
                 withName:(NSString*)name
                 withTouch:(nullable NSDictionary*)touch
                 withContext:(NSDictionary*)context
                 withTimestampms:(double)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self addAction:type name:name touch:touch context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(startResource, withKey:(NSString*)key
                 withMethod:(NSString*)method
                 withUrl:(NSString*)url
                 withContext:(NSDictionary*)context
                 withTimestampms:(double)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self startResource:key method:method url:url context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(stopResource, withKey:(NSString*)key
                 withStatuscode:(double)statusCode
                 withKind:(NSString*)kind
                 withSize:(double)size
                 withContext:(NSDictionary*)context
                 withTimestampms:(double)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self stopResource:key statusCode:statusCode kind:kind size:size context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(addError, withMessage:(NSString*)message
                 withSource:(NSString*)source
                 withStacktrace:(NSString*)stacktrace
                 withContext:(NSDictionary*)context
                 withTimestampms:(double)timestampMs
                 withFingerprint:(NSString*)fingerprint
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self addError:message source:source stacktrace:stacktrace context:context timestampMs:timestampMs fingerprint: fingerprint resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(addTiming, withName:(NSString*)name
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self addTiming:name resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(addViewAttribute:(NSString*) key
                  withValue:(NSDictionary*) value
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self addViewAttribute:key value:value resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(removeViewAttribute:(NSString*) key
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self removeViewAttribute:key resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(addViewAttributes:(NSDictionary*) attributes
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self addViewAttributes:attributes resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(removeViewAttributes:(NSArray *)keys
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self removeViewAttributes:keys resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(addViewLoadingTime, withOverwrite:(BOOL)overwrite
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self addViewLoadingTime:overwrite resolve:resolve reject:reject];
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

RCT_REMAP_METHOD(getCurrentSessionId,
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self getCurrentSessionId:resolve reject:reject];
}

RCT_REMAP_METHOD(startFeatureOperation,
                 startWithName:(NSString*)name
                 withOperationKey:(NSString*)operationKey
                 withAttributes:(NSDictionary*)attributes
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self startFeatureOperation:name operationKey:operationKey attributes:attributes resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(succeedFeatureOperation,
                 succeedWithName:(NSString*)name
                 withOperationKey:(NSString*)operationKey
                 withAttributes:(NSDictionary*)attributes
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self succeedFeatureOperation:name operationKey:operationKey attributes:attributes resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(failFeatureOperation,
                 failWithName:(NSString*)name
                 withOperationKey:(NSString*)operationKey
                 withReason:(NSString*)reason
                 withAttributes:(NSDictionary*)attributes
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self failFeatureOperation:name operationKey:operationKey reason:reason attributes:attributes resolve:resolve reject:reject];
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
        _ddRumImplementation = [[DdRumImplementation alloc] initWithBridge:_bridge];
    }
    return _ddRumImplementation;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (dispatch_queue_t)methodQueue {
    return [RNQueue getSharedQueue];
}

- (void)addAction:(NSString *)type name:(NSString *)name touch:(nullable NSDictionary *)touch context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation addActionWithType:type name:name touch:touch context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void)addError:(NSString *)message source:(NSString *)source stacktrace:(NSString *)stacktrace context:(NSDictionary *)context timestampMs:(double)timestampMs fingerprint:(NSString *)fingerprint resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation addErrorWithMessage:message source:source stacktrace:stacktrace context:context timestampMs:timestampMs fingerprint:fingerprint resolve:resolve reject:reject];
}

- (void)addFeatureFlagEvaluation:(NSString *)name value:(NSDictionary *)value resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation addFeatureFlagEvaluationWithName:name value:value resolve:resolve reject:reject];
}

- (void)getCurrentSessionId:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation getCurrentSessionId:resolve reject:reject];
}

- (void)addTiming:(NSString *)name resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation addTimingWithName:name resolve:resolve reject:reject];
}

- (void)addViewAttribute:(NSString *)key value:(NSDictionary *)value resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation addViewAttributeWithKey:key value:value resolve:resolve reject:reject];
}

- (void)removeViewAttribute:(NSString *)key resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation removeViewAttributeWithKey:key resolve:resolve reject:reject];
}

- (void)addViewAttributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation addViewAttributesWithAttributes:attributes resolve:resolve reject:reject];
}

- (void)removeViewAttributes:(NSArray *)keys resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation removeViewAttributesWithKeys:keys resolve:resolve reject:reject];
}

- (void)addViewLoadingTime:(BOOL)overwrite resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {\
    [self.ddRumImplementation addViewLoadingTimeWithOverwrite:overwrite resolve:resolve reject:reject];
}

- (void)startAction:(NSString *)type name:(NSString *)name context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation startActionWithType:type name:name context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void)startResource:(NSString *)key method:(NSString *)method url:(NSString *)url context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation startResourceWithKey:key method:method url:url context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void)startView:(NSString *)key name:(NSString *)name context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation startViewWithKey:key name:name context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void)stopAction:(NSString *)type name:(NSString *)name context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation stopActionWithType:type name:name context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void)stopResource:(NSString *)key statusCode:(double)statusCode kind:(NSString *)kind size:(double)size context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation stopResourceWithKey:key statusCode:statusCode kind:kind size:size context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void)stopSession:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation stopSessionWithResolve:resolve reject:reject];
}

- (void)stopView:(NSString *)key context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation stopViewWithKey:key context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void) startFeatureOperation:(NSString *)name operationKey:(NSString *)operationKey attributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation startFeatureOperationWithName:name operationKey:operationKey attributes:attributes resolve:resolve reject:reject];
}

- (void) succeedFeatureOperation:(NSString *)name operationKey:(NSString *)operationKey attributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation succeedFeatureOperationWithName:name operationKey:operationKey attributes:attributes resolve:resolve reject:reject];
}

- (void) failFeatureOperation:(NSString *)name operationKey:(NSString *)operationKey reason:(NSString *)reason attributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddRumImplementation failFeatureOperationWithName:name operationKey:operationKey reason:reason attributes:attributes resolve:resolve reject:reject];
}

@end
