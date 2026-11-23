/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@class DdInternalTestingImplementation;

// This header must stay importable from Objective-C and Swift, so it does not import the C++
// TurboModule spec. DdInternalTesting+TurboModule.mm adopts NativeDdInternalTestingSpec; the
// methods below are the spec's methods, declared here so that the compiler checks that
// DdInternalTesting implements them.
@interface DdInternalTesting : NSObject <RCTBridgeModule>

@property (nonatomic, strong) DdInternalTestingImplementation* ddInternalTestingImplementation;

+ (void)enableFromNative;

- (void)enable:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)clearData:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)getAllEvents:(NSString *)feature resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;

@end
