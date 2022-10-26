/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>

@interface JsRefreshRate : NSObject<RCTBridgeModule>

-(void)start:(nonnull void (^)(double frameTime))frameTimeCallback;
-(void)stop;
-(BOOL)isStarted;

@end
