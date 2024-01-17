/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
// Import this first to prevent require cycles
#if __has_include("DatadogInternalTesting-Swift.h")
#import <DatadogInternalTesting-Swift.h>
#else
#import <DatadogInternalTesting/DatadogInternalTesting-Swift.h>
#endif
#import "DdInternalTesting.h"


@implementation DdInternalTesting

@synthesize bridge = _bridge;
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

RCT_REMAP_METHOD(enable, withResolve:(RCTPromiseResolveBlock)resolve
                 withReject:(RCTPromiseRejectBlock)reject)
{
    [self enable:resolve reject:reject];
}

// Thanks to this guard, we won't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDdInternalTestingSpecJSI>(params);
}
#endif

- (DdInternalTestingImplementation*)ddInternalTestingImplementation
{
    if (_ddInternalTestingImplementation == nil) {
        _ddInternalTestingImplementation = [[DdInternalTestingImplementation alloc] init];
    }
    return _ddInternalTestingImplementation;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (void)clearData:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddInternalTestingImplementation clearDataWithResolve:resolve reject:reject];
}

- (void)getAllEvents:(NSString *)feature resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddInternalTestingImplementation getAllEventsWithFeature:feature resolve:resolve reject:reject];
}

- (void)enable:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddInternalTestingImplementation enableWithResolve:resolve reject:reject];
}

@end
