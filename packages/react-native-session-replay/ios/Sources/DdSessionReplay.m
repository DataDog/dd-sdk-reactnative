/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import "DatadogSDKReactNativeSessionReplaySwiftBridge.h"

#import "DdSessionReplay.h"


@implementation DdSessionReplay

@synthesize bridge = _bridge;
RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(enable, withEnableReplaySampleRate:(double)replaySampleRate
                 withCustomEndpoint:(NSString*)customEndpoint
                 withImagePrivacyLevel:(NSString*)imagePrivacyLevel
                 withTouchPrivacyLevel:(NSString*)touchPrivacyLevel
                 withTextAndInputPrivacyLevel:(NSString*)textAndInputPrivacyLevel
                 withStartRecordingImmediately:(BOOL)startRecordingImmediately
                 withEnableHeatmaps:(BOOL)enableHeatmaps
                 withEnableCompositionTreeRecording:(BOOL)enableCompositionTreeRecording
                 withAndroidAdaptiveCaptureSchedulingEnabled:(BOOL)androidAdaptiveCaptureSchedulingEnabled
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self enable:replaySampleRate
          customEndpoint:customEndpoint
          imagePrivacyLevel:imagePrivacyLevel
          touchPrivacyLevel:touchPrivacyLevel
          textAndInputPrivacyLevel:textAndInputPrivacyLevel
          startRecordingImmediately:startRecordingImmediately
          enableHeatmaps:enableHeatmaps
          enableCompositionTreeRecording:enableCompositionTreeRecording
          androidAdaptiveCaptureSchedulingEnabled:androidAdaptiveCaptureSchedulingEnabled
          resolve:resolve
          reject:reject];
}

RCT_EXPORT_METHOD(startRecording:(RCTPromiseResolveBlock)resolve withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self startRecording:resolve reject:reject];
}

RCT_EXPORT_METHOD(stopRecording:(RCTPromiseResolveBlock)resolve withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self stopRecording:resolve reject:reject];
}


- (DdSessionReplayImplementation*)ddSessionReplayImplementation
{
    if (_ddSessionReplayImplementation == nil) {
        _ddSessionReplayImplementation = [[DdSessionReplayImplementation alloc] initWithBridge:_bridge];
    }
    return _ddSessionReplayImplementation;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (void)enable:(double)replaySampleRate
        customEndpoint:(NSString*)customEndpoint
        imagePrivacyLevel:(NSString *)imagePrivacyLevel
        touchPrivacyLevel:(NSString *)touchPrivacyLevel
        textAndInputPrivacyLevel:(NSString *)textAndInputPrivacyLevel
        startRecordingImmediately:(BOOL)startRecordingImmediately
        enableHeatmaps:(BOOL)enableHeatmaps
        enableCompositionTreeRecording:(BOOL)enableCompositionTreeRecording
        androidAdaptiveCaptureSchedulingEnabled:(BOOL)androidAdaptiveCaptureSchedulingEnabled
        resolve:(RCTPromiseResolveBlock)resolve
        reject:(RCTPromiseRejectBlock)reject {
    // Adaptive capture scheduling is Android-only; accept it to keep the shared bridge signature aligned.
    [self.ddSessionReplayImplementation enableWithReplaySampleRate:replaySampleRate
                                                    customEndpoint:customEndpoint
                                                 imagePrivacyLevel:imagePrivacyLevel
                                                 touchPrivacyLevel:touchPrivacyLevel
                                          textAndInputPrivacyLevel:textAndInputPrivacyLevel
                                         startRecordingImmediately:startRecordingImmediately
                                                    enableHeatmaps:enableHeatmaps
                                    enableCompositionTreeRecording:enableCompositionTreeRecording
                                                           resolve:resolve
                                                            reject:reject];
}

- (void)startRecording:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSessionReplayImplementation startRecordingWithResolve:resolve reject:reject];
}

- (void)stopRecording:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSessionReplayImplementation stopRecordingWithResolve:resolve reject:reject];
}

@end
