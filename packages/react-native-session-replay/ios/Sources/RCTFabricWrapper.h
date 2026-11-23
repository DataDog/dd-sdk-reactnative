/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import "RCTTextPropertiesWrapper.h"

@interface RCTFabricWrapper : NSObject

- (nullable RCTTextPropertiesWrapper*)tryToExtractTextPropertiesFromView:(UIView* _Nonnull)view;

@end
