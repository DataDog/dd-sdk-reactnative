/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(DdRum, NSObject)

RCT_EXTERN_METHOD(startView:(NSString)key
                 withName:(NSString)name
                 withContext:(NSDictionary)context
                 withTimestampms:(NSInteger)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopView:(NSString)key
                 withContext:(NSDictionary)context
                 withTimestampms:(NSInteger)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startAction:(NSString)type
                 withName:(NSString)name
                 withContext:(NSDictionary)context
                 withTimestampms:(NSInteger)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopAction:(NSString)type
                 withName:(NSString)name
                 withContext:(NSDictionary)context
                 withTimestampms:(NSInteger)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addAction:(NSString)type
                 withName:(NSString)name
                 withContext:(NSDictionary)context
                 withTimestampms:(NSInteger)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startResource:(NSString)key
                 withMethod:(NSString)method
                 withUrl:(NSString)url
                 withContext:(NSDictionary)context
                 withTimestampms:(NSInteger)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopResource:(NSString)key
                 withStatuscode:(NSInteger)statusCode
                 withKind:(NSString)kind
                 withSize:(NSInteger)size
                 withContext:(NSDictionary)context
                 withTimestampms:(NSInteger)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addError:(NSString)message
                 withSource:(NSString)source
                 withStacktrace:(NSString)stacktrace
                 withContext:(NSDictionary)context
                 withTimestampms:(NSInteger)timestampMs
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addTiming:(NSString)name
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopSession:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

@end
