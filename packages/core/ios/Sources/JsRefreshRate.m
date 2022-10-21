/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// This ensures we can use [_bridge dispatchBlock]
#import <React/RCTBridge+Private.h>
#import "JsRefreshRate.h"

NSTimeInterval jsLongTaskThresholdInSeconds = 0.1;

@implementation JsRefreshRate {
  CADisplayLink *_jsDisplayLink;
  NSTimeInterval _lastFrameTimestamp;
  BOOL _isStarted;
}

@synthesize bridge = _bridge;
RCT_EXPORT_MODULE()

static JsRefreshRate *_pluginSingleton = nil;
- (instancetype)init {
  self->_isStarted = false;

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
        [self->_jsDisplayLink invalidate];
    }
        
    [_bridge dispatchBlock:^{
      self->_jsDisplayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(onJSFrame:)];
      [self->_jsDisplayLink addToRunLoop:[NSRunLoop currentRunLoop] forMode:NSRunLoopCommonModes];
    }
    queue:RCTJSThread];
    
    self->_isStarted = true;
}

- (void)stop {
    if (self->_jsDisplayLink) {
        [self->_jsDisplayLink invalidate];
        self->_jsDisplayLink = nil;
    }
    self->_isStarted = false;
}

- (BOOL)isStarted {
    return self->_isStarted;
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
      if (frameDuration > jsLongTaskThresholdInSeconds) {
          // TODO: Report js long task
          NSLog(@"js long tasks");
      }
      // TODO: Call SDK to register call
      NSLog(@"%f", frameDuration);
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
