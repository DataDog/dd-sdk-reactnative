/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
#import "DatadogInternalTestingSwiftBridge.h"
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

+ (void)enableFromNative {
    DdInternalTestingNativeInitialization *internalTesting = [[DdInternalTestingNativeInitialization alloc] init];
    [internalTesting enableFromNative];
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
