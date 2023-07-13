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
#import "DdTrace.h"


@implementation DdTrace

RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(startSpan, withOperation:(NSString*)operation
                 withContext:(NSDictionary*)context
                 withTimestampms:(double)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self startSpan:operation context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(finishSpan, withSpanId:(NSString*)spanId
                 withContext:(NSDictionary*)context
                 withTimestampms:(double)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self finishSpan:spanId context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

// Thanks to this guard, we won't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDdTraceSpecJSI>(params);
}
#endif

- (void)startSpan:(NSString *)operation context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddTraceImplementation startSpanWithOperation:operation context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (void)finishSpan:(NSString *)spanId context:(NSDictionary *)context timestampMs:(double)timestampMs resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddTraceImplementation finishSpanWithSpanId:spanId context:context timestampMs:timestampMs resolve:resolve reject:reject];
}

- (DdTraceImplementation*)ddTraceImplementation
{
    if (_ddTraceImplementation == nil) {
        _ddTraceImplementation = [[DdTraceImplementation alloc] init];
    }
    return _ddTraceImplementation;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (dispatch_queue_t)methodQueue {
    return [RNQueue getSharedQueue];
}

@end
