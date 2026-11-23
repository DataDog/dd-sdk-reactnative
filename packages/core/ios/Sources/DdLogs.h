/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@class DdLogsImplementation;

// This header must stay importable from Objective-C and Swift, so it does not import the C++
// TurboModule spec. DdLogs+TurboModule.mm adopts NativeDdLogsSpec; the methods below are the spec's
// methods, declared here so that the compiler checks that DdLogs implements them.
@interface DdLogs : NSObject <RCTBridgeModule>

@property (nonatomic, strong) DdLogsImplementation* ddLogsImplementation;

- (void)debug:(NSString *)message context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)info:(NSString *)message context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)warn:(NSString *)message context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)error:(NSString *)message context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)debugWithError:(NSString *)message errorKind:(NSString *)errorKind errorMessage:(NSString *)errorMessage stacktrace:(NSString *)stacktrace context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)infoWithError:(NSString *)message errorKind:(NSString *)errorKind errorMessage:(NSString *)errorMessage stacktrace:(NSString *)stacktrace context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)warnWithError:(NSString *)message errorKind:(NSString *)errorKind errorMessage:(NSString *)errorMessage stacktrace:(NSString *)stacktrace context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)errorWithError:(NSString *)message errorKind:(NSString *)errorKind errorMessage:(NSString *)errorMessage stacktrace:(NSString *)stacktrace context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;

@end
