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

RCT_REMAP_METHOD(enable, withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
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

- (void)enable:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddInternalTestingImplementation enableWithResolve:resolve reject:reject];
}

@end
