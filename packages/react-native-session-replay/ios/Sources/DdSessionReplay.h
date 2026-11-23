/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@class DdSessionReplayImplementation;

// This header must stay importable from Objective-C and Swift, so it does not import the C++
// TurboModule spec. DdSessionReplay+TurboModule.mm adopts NativeDdSessionReplaySpec; the methods
// below are the spec's methods, declared here so that the compiler checks that DdSessionReplay
// implements them.
@interface DdSessionReplay : NSObject <RCTBridgeModule>

@property (nonatomic, strong) DdSessionReplayImplementation* ddSessionReplayImplementation;

- (void)enable:(double)replaySampleRate customEndpoint:(NSString*)customEndpoint imagePrivacyLevel:(NSString *)imagePrivacyLevel touchPrivacyLevel:(NSString *)touchPrivacyLevel textAndInputPrivacyLevel:(NSString *)textAndInputPrivacyLevel startRecordingImmediately:(BOOL)startRecordingImmediately enableHeatmaps:(BOOL)enableHeatmaps enableCompositionTreeRecording:(BOOL)enableCompositionTreeRecording androidAdaptiveCaptureSchedulingEnabled:(BOOL)androidAdaptiveCaptureSchedulingEnabled resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)startRecording:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)stopRecording:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;

@end
