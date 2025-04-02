#import "DdViewWrapper.h"
#import <React/RCTViewComponentView.h>
#import <react/renderer/components/DdSDKReactNativeSessionReplay/ComponentDescriptors.h>
#import <react/renderer/components/DdSDKReactNativeSessionReplay/EventEmitters.h>
#import <react/renderer/components/DdSDKReactNativeSessionReplay/Props.h>
#import <react/renderer/components/DdSDKReactNativeSessionReplay/RCTComponentViewHelpers.h>
#import <React/RCTFabricComponentsPlugins.h>
#import "DatadogSDKReactNativeSessionReplay-Swift.h"

using namespace facebook::react;

// Private Fabric subclass explicitly handling props:
@interface DdViewFabric : RCTViewComponentView <RCTDdViewViewProtocol>
//@property (nonatomic, strong) UIView *contentSubview;
@property (nonatomic, strong) DdView *ddView;
@end

@implementation DdViewFabric

+ (ComponentDescriptorProvider)componentDescriptorProvider {
    return concreteComponentDescriptorProvider<DdViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
    if (self = [super initWithFrame:frame]) {
        static const auto defaultProps = std::make_shared<const DdViewProps>();
        _props = defaultProps;

        _ddView = [[DdView alloc] initWithFrame:self.bounds];
        _ddView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        [self.contentView addSubview:_ddView];
    }
    return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
    const auto &newProps = *std::static_pointer_cast<DdViewProps const>(props);
    
    _ddView.textAndInputPrivacy = [NSString stringWithUTF8String:newProps.textAndInputPrivacy.c_str()];
    
    _ddView.imagePrivacy = [NSString stringWithUTF8String:newProps.imagePrivacy.c_str()];
    
    _ddView.touchPrivacy = [NSString stringWithUTF8String:newProps.touchPrivacy.c_str()];
    
    _ddView.hide = newProps.hide;
    
    [_ddView debugPrintOverrides];

//    // Handle `textAndInputPrivacy` prop explicitly
//    NSString *textAndInputPrivacy = [NSString stringWithUTF8String:newProps.textAndInputPrivacy.c_str()];
//    // TODO: Handle textAndInputPrivacy logic here
//
//    // Handle `imagePrivacy` prop explicitly
//    NSString *imagePrivacy = [NSString stringWithUTF8String:newProps.imagePrivacy.c_str()];
//    // TODO: Handle imagePrivacy logic here
//
//    // Handle `touchPrivacy` prop explicitly
//    NSString *touchPrivacy = [NSString stringWithUTF8String:newProps.touchPrivacy.c_str()];
//    // TODO: Handle touchPrivacy logic here
//    
//    NSLog(@"textAndInputPrivacy: %@",textAndInputPrivacy);
//    
//    NSLog(@"imagePrivacy: %@",imagePrivacy);
//    
//    self.dd.sessionReplayOverrides.imagePrivacy = .maskAll
//    
//    self.dd.sessionReplayOverrides.textAndInputPrivacy = .maskSensitiveInputs
//    
//    
//    NSLog(@"imagePrivacy: %@", self.dd);
//
//    // Handle `hide` prop explicitly
//    BOOL hide = newProps.hide;
//    self.hidden = hide;
//
    
    [super updateProps:props oldProps:oldProps];
}

@end

// Public wrapper explicitly:
@implementation DdViewWrapper {
    DdViewFabric *_fabricView;
}

- (instancetype)initWithFrame:(CGRect)frame {
    if (self = [super initWithFrame:frame]) {
        _fabricView = [[DdViewFabric alloc] initWithFrame:self.bounds];
        _fabricView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        [self addSubview:_fabricView];
    }
    return self;
}

@end

// Fabric registration explicitly points to private subclass:
Class<RCTComponentViewProtocol> DdViewCls(void) {
    return DdViewFabric.class;
}
