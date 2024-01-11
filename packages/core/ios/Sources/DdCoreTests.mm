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
#import "DdCoreTests.h"


@implementation DdCoreTests

RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(clearData, withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self clearData:resolve reject:reject];
}

RCT_REMAP_METHOD(getAllEvents, withFeature: (NSString *)feature
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self getAllEvents:feature resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(getAllEventsData, withDataFeature: (NSString *)feature
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self getAllEventsData:feature resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(startRecording, withResolver2:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self startRecording:resolve reject:reject];
}


// Thanks to this guard, we won't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDdCoreTestsSpecJSI>(params);
}
#endif

- (DdCoreTestsImplementation*)ddCoreTestsImplementation
{
    if (_ddCoreTestsImplementation == nil) {
        _ddCoreTestsImplementation = [[DdCoreTestsImplementation alloc] init];
    }
    return _ddCoreTestsImplementation;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (dispatch_queue_t)methodQueue {
    return [RNQueue getSharedQueue];
}


- (void)clearData:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddCoreTestsImplementation clearDataWithResolve:resolve reject:reject];
}

- (void)getAllEvents:(NSString *)feature resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddCoreTestsImplementation getAllEventsWithFeature:feature resolve:resolve reject:reject];
}

- (void)getAllEventsData:(NSString *)feature resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddCoreTestsImplementation getAllEventsDataWithFeature:feature resolve:resolve reject:reject];
}

- (void)startRecording:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddCoreTestsImplementation startRecordingWithResolve:resolve reject:reject];
}

@end
