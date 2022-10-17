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

@implementation JsRefreshRate {
  CADisplayLink *_jsDisplayLink;
  NSTimeInterval _lastFrameTimestamp;
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
  self = [super init];

  self->_lastFrameTimestamp = -1;

  return self;
}

- (void)start {
    if (self->_jsDisplayLink != nil) {
        return;
    }
        
    [_bridge dispatchBlock:^{
      self->_jsDisplayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(onJSFrame:)];
      [self->_jsDisplayLink addToRunLoop:[NSRunLoop currentRunLoop] forMode:NSRunLoopCommonModes];
    }
    queue:RCTJSThread];
}

- (void)stop {
    if (self->_jsDisplayLink) {
        [self->_jsDisplayLink invalidate];
        self->_jsDisplayLink = nil;
    }
}

- (void)onJSFrame:(CADisplayLink *)displayLink
{
  [self onFrameTick:displayLink];
}

- (void)onFrameTick:(CADisplayLink *)displayLink
{
  NSTimeInterval frameTimestamp = displayLink.timestamp;
  if (self->_lastFrameTimestamp != -1) {
      NSTimeInterval frameDuration = frameTimestamp - self->_lastFrameTimestamp;
      double currentFPS = 1.0 / frameDuration;
      // TODO: Call SDK to register call
      // TODO: Check at which frequency we can call the native SDK
      NSLog(@"%f", currentFPS);
  }
  self->_lastFrameTimestamp = frameTimestamp;
}

+ (BOOL)requiresMainQueueSetup {
  return TRUE;
}

- (void)appWillResignActive {
    [self stop];
}

- (void)appDidBecomeActive {
    [self start];
}

@end
