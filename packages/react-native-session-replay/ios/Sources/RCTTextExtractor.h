/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
#import <Foundation/Foundation.h>
#import "RCTTextPropertiesWrapper.h"

@class RCTUIManager;

@interface RCTTextExtractor : NSObject

- (nullable RCTTextPropertiesWrapper*)tryToExtractTextPropertiesFromView:(UIView* _Nonnull)view
                                                           withUIManager:(RCTUIManager* _Nonnull)uiManager;

- (BOOL)isRCTTextView:(UIView* _Nonnull)view;

@end
