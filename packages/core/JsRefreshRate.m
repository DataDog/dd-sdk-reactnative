//
//  JsRefreshRate.m
//  DatadogSDKReactNative
//
//  Created by Louis Zawadzki on 13/10/2022.
//

// This ensures we can use [_bridge dispatchBlock]
#import <React/RCTBridge+Private.h>

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

@interface JsRefreshRate : NSObject
@property (nonatomic, strong, readonly) RCTBridge *bridge;
@end

@implementation JsRefreshRate {
  CADisplayLink *_jsDisplayLink;

  FrameCountHolder *jsFrameCountHolder;
}

@synthesize bridge = _bridge;
RCT_EXPORT_MODULE()

/**
 Hack (non threadsafe) to populate Flipper plugin with the bridge automatically
 This flipper plugin is also a React Native native module, so that:
 1. We initialize the plugin for flipper
 2. RN automatically goes through init (since we have RCT_EXPORT_MODULE)
 3. RN automatically sets the bridge
  
 It simplifies installation but we should remove it if it create issues
 */
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

- (void)startMeasuring
{
  [jsFrameCountHolder setPreviousTime:-1];

  [_bridge dispatchBlock:^{
    self->_jsDisplayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(onJSFrame:)];
    [self->_jsDisplayLink addToRunLoop:[NSRunLoop currentRunLoop] forMode:NSRunLoopCommonModes];
  }
   queue:RCTJSThread];
}

- (void) stopMeasuring
{
  [self->_jsDisplayLink invalidate];
  self->_jsDisplayLink = nil;
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
      // Call SDK to register call
      
//    [_connection send:@"addRecord" withParams:@{
//      @"frameCount" : [NSNumber numberWithLong:[frameCountHolder frameCount]],
//      @"time": [NSNumber numberWithLong:(frameTimestamp - [frameCountHolder previousTime]) * 1000],
//      @"thread": threadName
//    }];

    [frameCountHolder setPreviousTime:frameTimestamp];
    [frameCountHolder setFrameCount:0];
  }
}

- (void)didConnect {
    // Start measurement when the sdk is initialized
    
//  [connection receive:@"startMeasuring"
//            withBlock:^(NSDictionary* params, id<FlipperResponder> responder) {
//    [self startMeasuring];
//  }];
//
//  [connection receive:@"stopMeasuring" withBlock:^(NSDictionary* params, id<FlipperResponder> responder) {
//    [self stopMeasuring];
//  }];
}

- (void)didDisconnect {
  [self stopMeasuring];
}


@end
