/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#if RCT_NEW_ARCH_ENABLED
#import <React/RCTViewComponentView.h>
#import <react/renderer/components/DdSDKReactNativeSessionReplay/ComponentDescriptors.h>
#import <react/renderer/components/DdSDKReactNativeSessionReplay/EventEmitters.h>
#import <react/renderer/components/DdSDKReactNativeSessionReplay/Props.h>
#import <react/renderer/components/DdSDKReactNativeSessionReplay/RCTComponentViewHelpers.h>
#import <React/RCTFabricComponentsPlugins.h>


#if __has_include("DatadogSDKReactNativeSessionReplay-Swift.h")
#import <DatadogSDKReactNativeSessionReplay-Swift.h>
#else
#import <DatadogSDKReactNativeSessionReplay/DatadogSDKReactNativeSessionReplay-Swift.h>
#endif
#import <objc/runtime.h>
#import "DdPrivacyViewFabric.h"

using namespace facebook::react;

@implementation DdPrivacyViewFabric {
    UIView * _view;
    
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
    return concreteComponentDescriptorProvider<DdPrivacyViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
    if (self = [super initWithFrame:frame]) {
        static const auto defaultProps = std::make_shared<const DdPrivacyViewProps>();
        _props = defaultProps;
    }
    return self;
}


- (void)setNativeID:(NSString *)nativeID {
    objc_setAssociatedObject(self, @selector(nativeID), nativeID, OBJC_ASSOCIATION_COPY_NONATOMIC);
}

- (NSString *)nativeID {
    return objc_getAssociatedObject(self, @selector(nativeID));
}
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
    const auto &newProps = *std::static_pointer_cast<DdPrivacyViewProps const>(props);
    
    NSString *text = [NSString stringWithUTF8String:newProps.textAndInputPrivacy.c_str()];
    NSString *image = [NSString stringWithUTF8String:newProps.imagePrivacy.c_str()];
    NSString *touch = [NSString stringWithUTF8String:newProps.touchPrivacy.c_str()];
    NSString *nativeID = [NSString stringWithUTF8String:newProps.nativeID.c_str()];
    NSMutableDictionary<NSString *, NSString *> *attributesDict = [NSMutableDictionary new];
    
    attributesDict[@"type"] = [NSString stringWithUTF8String:newProps.attributes.type.c_str()];
    attributesDict[@"width"] = [NSString stringWithUTF8String:newProps.attributes.width.c_str()];
    attributesDict[@"height"] = [NSString stringWithUTF8String:newProps.attributes.height.c_str()];
    attributesDict[@"hash"] = [NSString stringWithUTF8String:newProps.attributes.hash.c_str()];
    
    [DdPrivacyOverrider setOverridesFor:self textPrivacy:text imagePrivacy:image touchPrivacy:touch hide:newProps.hide];
    self.nativeID = nativeID;
    self.attributes = attributesDict;
    
    self.accessibilityIdentifier = nativeID;
    [super updateProps:props oldProps:oldProps];
}

@end

Class<RCTComponentViewProtocol> DdPrivacyViewCls(void) {
    return DdPrivacyViewFabric.class;
}
#endif
