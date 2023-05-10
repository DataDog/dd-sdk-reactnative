/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(DdLogs, NSObject)

RCT_EXTERN_METHOD(debug:(NSString)message
                 withContext:(NSDictionary)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(info:(NSString)message
                 withContext:(NSDictionary)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(warn:(NSString)message
                 withContext:(NSDictionary)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(error:(NSString)message
                 withContext:(NSDictionary)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(debugWithError:(NSString)message
                 withErrorKind:(NSString)errorKind
                 withErrorMessage:(NSString)errorMessage
                 withStacktrace:(NSString)stacktrace
                 withContext:(NSDictionary)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(infoWithError:(NSString)message
                 withErrorKind:(NSString)errorKind
                 withErrorMessage:(NSString)errorMessage
                 withStacktrace:(NSString)stacktrace
                 withContext:(NSDictionary)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(warnWithError:(NSString)message
                 withErrorKind:(NSString)errorKind
                 withErrorMessage:(NSString)errorMessage
                 withStacktrace:(NSString)stacktrace
                 withContext:(NSDictionary)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(errorWithError:(NSString)message
                 withErrorKind:(NSString)errorKind
                 withErrorMessage:(NSString)errorMessage
                 withStacktrace:(NSString)stacktrace
                 withContext:(NSDictionary)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
@end
