/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// This ensures we can use [_bridge dispatchBlock]
#import <React/RCTBridge+Private.h>
#import "JsRefreshRate.h"

@interface FrameCountHolder : NSObject

// See https://github.com/facebook/react-native/blob/1465c8f3874cdee8c325ab4a4916fda0b3e43bdb/React/CoreModules/RCTFPSGraph.m#L29
@property (nonatomic, assign) NSUInteger frameCount;
@property (nonatomic, assign) NSTimeInterval previousTime;

- (void)incrementFrameCount;

@end

@implementation FrameCountHolder

- (instancetype)init {
  _previousTime = -1;
  _frameCount = -1;
  
  return self;
}

- (void)incrementFrameCount {
  _frameCount ++;
}

@end

@implementation JsRefreshRate {
  CADisplayLink *_jsDisplayLink;

  FrameCountHolder *jsFrameCountHolder;
}

@synthesize bridge = _bridge;
RCT_EXPORT_MODULE()

static JsRefreshRate *_pluginSingleton = nil;

- (instancetype)init {
  if (!_pluginSingleton) {
    self = [self initSingleton];
    _pluginSingleton = self;
  }

  return _pluginSingleton;
}

- (instancetype)initSingleton {
  jsFrameCountHolder = [FrameCountHolder new];
  return self;
}

- (void)startMeasuring {
    [jsFrameCountHolder setPreviousTime:-1];

    [_bridge dispatchBlock:^{
      self->_jsDisplayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(onJSFrame:)];
      [self->_jsDisplayLink addToRunLoop:[NSRunLoop currentRunLoop] forMode:NSRunLoopCommonModes];
    }
    queue:RCTJSThread];
}

- (void)onJSFrame:(CADisplayLink *)displayLink
{
  [self onFrameTick:displayLink frameCountHolder:jsFrameCountHolder threadName:@"JS"];
}

- (void)onFrameTick:(CADisplayLink *)displayLink frameCountHolder:(FrameCountHolder*)frameCountHolder threadName:(NSString*)threadName
{
  NSTimeInterval frameTimestamp = displayLink.timestamp;
  
  // See https://github.com/facebook/react-native/blob/1465c8f3874cdee8c325ab4a4916fda0b3e43bdb/React/CoreModules/RCTFPSGraph.m#L86
  [frameCountHolder incrementFrameCount];
  if ([frameCountHolder previousTime] == -1) {
    [frameCountHolder setPreviousTime:frameTimestamp];
  } else if (frameTimestamp - [frameCountHolder previousTime] >= 0.5) {
    // TODO: Call SDK to register call
    // TODO: Check at which frequency we can call the native SDK

    [frameCountHolder setPreviousTime:frameTimestamp];
    [frameCountHolder setFrameCount:0];
  }
}

+ (BOOL)requiresMainQueueSetup {
  return TRUE;
}

@end
