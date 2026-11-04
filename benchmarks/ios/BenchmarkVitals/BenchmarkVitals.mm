/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#if __has_include("BenchmarkRunner-Swift.h")
#import "BenchmarkRunner-Swift.h"
#else
#import <BenchmarkRunner/BenchmarkRunner-Swift.h>
#endif
#import "BenchmarkVitals.h"

@implementation BenchmarkVitals

RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(startCollectingVitals, startCollectingVitalswithConfig:(NSDictionary *)config
                                        withResolve: (RCTPromiseResolveBlock)resolve
                                        withRejecter: (RCTPromiseRejectBlock)reject)
{
  [self startCollectingVitals:config resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(stopCollectingVitals, stopCollectingVitalswithResolve: (RCTPromiseResolveBlock)resolve
                 withRejecter: (RCTPromiseRejectBlock)reject)
{
  [self stopCollectingVitals:resolve reject:reject];
}

RCT_REMAP_METHOD(reportFullyDisplayed, reportFullyDisplayedwithConfig:(NSDictionary *)config
                                       withResolve: (RCTPromiseResolveBlock)resolve
                                       withRejecter: (RCTPromiseRejectBlock)reject)
{
  [self reportFullyDisplayed:config resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(armColdStart, armColdStartwithConfig:(NSDictionary *)config
                               withResolve: (RCTPromiseResolveBlock)resolve
                               withRejecter: (RCTPromiseRejectBlock)reject)
{
  [self armColdStart:config resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(consumeColdStartConfig, consumeColdStartConfigwithResolve: (RCTPromiseResolveBlock)resolve
                 withRejecter: (RCTPromiseRejectBlock)reject)
{
  [self consumeColdStartConfig:resolve reject:reject];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeBenchmarkVitalsSpecJSI>(params);
}
#endif

- (BenchmarkVitalsImplementation*)benchmarkVitalsImplementation 
{
    if (_benchmarkVitalsImplementation == nil) {
      _benchmarkVitalsImplementation = [[BenchmarkVitalsImplementation alloc] init];
    }
    return _benchmarkVitalsImplementation;
}


- (void)startCollectingVitals:(NSDictionary *)config resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.benchmarkVitalsImplementation startCollectingVitalsWithConfig:config resolve:resolve reject:reject];
}

- (void)stopCollectingVitals:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.benchmarkVitalsImplementation stopCollectingVitalsWithResolve:resolve reject:reject];
}

- (void)reportFullyDisplayed:(NSDictionary *)config resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.benchmarkVitalsImplementation reportFullyDisplayedWithConfig:config resolve:resolve reject:reject];
}

- (void)armColdStart:(NSDictionary *)config resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.benchmarkVitalsImplementation armColdStartWithConfig:config resolve:resolve reject:reject];
}

- (void)consumeColdStartConfig:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.benchmarkVitalsImplementation consumeColdStartConfigWithResolve:resolve reject:reject];
}

@end
