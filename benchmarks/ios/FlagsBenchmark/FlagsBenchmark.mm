/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

#import "FlagsBenchmark.h"
#ifdef DD_FLAGS_PROTOTYPE_ENABLED
@import RulesEvaluationPrototype;
#endif

@implementation FlagsBenchmark {
  dispatch_queue_t _queue;
  NSLock *_lock;
#ifdef DD_FLAGS_PROTOTYPE_ENABLED
  DDFlagsBenchmark *_engine;
#endif
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup { return NO; }

- (instancetype)init {
  if ((self = [super init])) {
    _queue = dispatch_queue_create("com.datadog.flags.benchmark", DISPATCH_QUEUE_SERIAL);
    _lock = [NSLock new];
#ifdef DD_FLAGS_PROTOTYPE_ENABLED
    _engine = [DDFlagsBenchmark new];
#endif
  }
  return self;
}

- (NSDictionary *)execute:(NSDictionary *)request {
#ifdef DD_FLAGS_PROTOTYPE_ENABLED
  [_lock lock];
  NSDictionary *result = [_engine run:request];
  [_lock unlock];
  if ([request[@"op"] isEqual:@"metadata"]) {
    NSMutableDictionary *metadata = [result mutableCopy];
#ifdef RCT_NEW_ARCH_ENABLED
    metadata[@"newArchitecture"] = @YES;
#else
    metadata[@"newArchitecture"] = @NO;
#endif
    return metadata;
  }
  return result;
#else
  return @{ @"benchmarkError": @"Set DD_FLAGS_PROTOTYPE_PATH and run pod install" };
#endif
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(runSync:(NSDictionary *)request) {
  // Inline synchronous reads avoid adding an artificial dispatch hop to the comparison.
  return [self execute:request];
}

RCT_REMAP_METHOD(runAsync, runAsync:(NSDictionary *)request
                 resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  dispatch_async(_queue, ^{ resolve([self execute:request]); });
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeFlagsBenchmarkSpecJSI>(params);
}
#endif
@end
