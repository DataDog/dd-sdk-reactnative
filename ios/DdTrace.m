/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

@import React;

@interface RCT_EXTERN_MODULE(DdTrace, NSObject)

RCT_EXTERN_METHOD(startSpan:(NSString)operation
                 withTimestampms:(NSInteger)timestampMs
                 withContext:(NSDictionary)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(finishSpan:(NSString)spanId
                 withTimestampms:(NSInteger)timestampMs
                 withContext:(NSDictionary)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

@end
