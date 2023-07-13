/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
// Import this first to prevent require cycles
#if __has_include("DatadogSDKReactNative-Swift.h")
#import <DatadogSDKReactNative-Swift.h>
#else
#import <DatadogSDKReactNative/DatadogSDKReactNative-Swift.h>
#endif
#import "DdLogs.h"


@implementation DdLogs

RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(debug, withDebugMessage:(NSString*)message
                 withContext:(NSDictionary*)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self debug:message context:context resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(info, withInfoMessage:(NSString*)message
                 withContext:(NSDictionary*)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self info:message context:context resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(warn, withWarnMessage:(NSString*)message
                 withContext:(NSDictionary*)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self warn:message context:context resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(error, withMessage:(NSString*)message
                 withContext:(NSDictionary*)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self error:message context:context resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(debugWithError, withDebugMessage:(NSString*)message
                 withErrorKind:(NSString*)errorKind
                 withErrorMessage:(NSString*)errorMessage
                 withStacktrace:(NSString*)stacktrace
                 withContext:(NSDictionary*)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self debugWithError:message errorKind:errorKind errorMessage:errorMessage stacktrace:stacktrace context:context resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(infoWithError, withInfoMessage:(NSString*)message
                 withErrorKind:(NSString*)errorKind
                 withErrorMessage:(NSString*)errorMessage
                 withStacktrace:(NSString*)stacktrace
                 withContext:(NSDictionary*)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self infoWithError:message errorKind:errorKind errorMessage:errorMessage stacktrace:stacktrace context:context resolve:resolve reject:reject];
}            

RCT_REMAP_METHOD(warnWithError, withWarnMessage:(NSString*)message
                 withErrorKind:(NSString*)errorKind
                 withErrorMessage:(NSString*)errorMessage
                 withStacktrace:(NSString*)stacktrace
                 withContext:(NSDictionary*)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self warnWithError:message errorKind:errorKind errorMessage:errorMessage stacktrace:stacktrace context:context resolve:resolve reject:reject];
}            

RCT_REMAP_METHOD(errorWithError, withMessage:(NSString*)message
                 withErrorKind:(NSString*)errorKind
                 withErrorMessage:(NSString*)errorMessage
                 withStacktrace:(NSString*)stacktrace
                 withContext:(NSDictionary*)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self errorWithError:message errorKind:errorKind errorMessage:errorMessage stacktrace:stacktrace context:context resolve:resolve reject:reject];
}            

// Thanks to this guard, we won't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDdLogsSpecJSI>(params);
}
#endif

- (DdLogsImplementation*)ddLogsImplementation
{
    if (_ddLogsImplementation == nil) {
        _ddLogsImplementation = [[DdLogsImplementation alloc] init];
    }
    return _ddLogsImplementation;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (dispatch_queue_t)methodQueue {
    return [RNQueue getSharedQueue];
}


- (void)debug:(NSString *)message context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddLogsImplementation debugWithMessage:message context:context resolve:resolve reject:reject];
}

- (void)debugWithError:(NSString *)message errorKind:(NSString *)errorKind errorMessage:(NSString *)errorMessage stacktrace:(NSString *)stacktrace context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddLogsImplementation debugWithErrorWithMessage:message errorKind:errorKind errorMessage:errorMessage stacktrace:stacktrace context:context resolve:resolve reject:reject];
}

- (void)error:(NSString *)message context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddLogsImplementation errorWithMessage:message context:context resolve:resolve reject:reject];
}

- (void)errorWithError:(NSString *)message errorKind:(NSString *)errorKind errorMessage:(NSString *)errorMessage stacktrace:(NSString *)stacktrace context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddLogsImplementation errorWithErrorWithMessage:message errorKind:errorKind errorMessage:errorMessage stacktrace:stacktrace context:context resolve:resolve reject:reject];
}

- (void)info:(NSString *)message context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddLogsImplementation infoWithMessage:message context:context resolve:resolve reject:reject];
}

- (void)infoWithError:(NSString *)message errorKind:(NSString *)errorKind errorMessage:(NSString *)errorMessage stacktrace:(NSString *)stacktrace context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddLogsImplementation infoWithErrorWithMessage:message errorKind:errorKind errorMessage:errorMessage stacktrace:stacktrace context:context resolve:resolve reject:reject];
}

- (void)warn:(NSString *)message context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddLogsImplementation warnWithMessage:message context:context resolve:resolve reject:reject];
}

- (void)warnWithError:(NSString *)message errorKind:(NSString *)errorKind errorMessage:(NSString *)errorMessage stacktrace:(NSString *)stacktrace context:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddLogsImplementation warnWithErrorWithMessage:message errorKind:errorKind errorMessage:errorMessage stacktrace:stacktrace context:context resolve:resolve reject:reject];
}

@end
