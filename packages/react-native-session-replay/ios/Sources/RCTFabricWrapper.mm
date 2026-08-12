/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import "RCTFabricWrapper.h"

#if RCT_NEW_ARCH_ENABLED
#import "RCTVersion.h"
#import "ParagraphProps.h"
#if RCT_VERSION_MINOR <= 73
#import "RCTConversions.h"
#endif

namespace rct = facebook::react;
typedef facebook::react::Props::Shared (*RCTFabricWrapperPropsIMP)(id, SEL);
#endif

@implementation RCTFabricWrapper

#if RCT_NEW_ARCH_ENABLED
/**
 * `RCTParagraphComponentView` is compiled into the app (it's not a lazily-loaded plugin), so
 * the class is resolvable as soon as this method can be called at all — it's safe to resolve
 * it once and cache it rather than paying for an `NSClassFromString` lookup on every view
 * checked during snapshotting.
 */
+ (nullable Class)paragraphComponentViewClass {
    static Class sClass;
    static dispatch_once_t sOnceToken;
    dispatch_once(&sOnceToken, ^{
        sClass = NSClassFromString(@"RCTParagraphComponentView");
    });
    return sClass;
}

/**
 * `-props` is declared on RCTComponentViewProtocol (not on RCTParagraphComponentView itself),
 * so its selector is looked up dynamically too rather than relying on the protocol's header.
 */
+ (SEL)propsSelector {
    static SEL sSelector;
    static dispatch_once_t sOnceToken;
    dispatch_once(&sOnceToken, ^{
        sSelector = NSSelectorFromString(@"props");
    });
    return sSelector;
}

/**
 * `-props` returns a C++ shared_ptr, so it can't be reached through KVC — its IMP is looked up
 * and cached once instead, since it's the same for every instance of the (fixed) class above.
 */
+ (nullable RCTFabricWrapperPropsIMP)propsIMP {
    static RCTFabricWrapperPropsIMP sImp;
    static dispatch_once_t sOnceToken;
    dispatch_once(&sOnceToken, ^{
        Class paragraphComponentViewClass = [self paragraphComponentViewClass];
        SEL propsSelector = [self propsSelector];
        if (paragraphComponentViewClass != nil && [paragraphComponentViewClass instancesRespondToSelector:propsSelector]) {
            sImp = (RCTFabricWrapperPropsIMP)[paragraphComponentViewClass instanceMethodForSelector:propsSelector];
        }
    });
    return sImp;
}
#endif

/**
 * Extracts the text properties from the given UIView when the view is of type RCTParagraphComponentView, returns nil otherwise.
 *
 * This deliberately avoids importing RCTParagraphComponentView.h / RCTComponentViewProtocol.h:
 * both live in the React-RCTFabric pod, which React Native's "prebuilt core" CocoaPods facade
 * (RN >= 0.87) ships without public headers, aside from a narrow allowlist that doesn't cover
 * either of them. The class and its `-props` accessor are resolved dynamically instead, and
 * cached (see paragraphComponentViewClass / propsIMP above) since this runs on every view
 * checked during snapshotting.
 */
- (nullable RCTTextPropertiesWrapper*)tryToExtractTextPropertiesFromView:(UIView *)view {
    #if RCT_NEW_ARCH_ENABLED
    Class paragraphComponentViewClass = [RCTFabricWrapper paragraphComponentViewClass];
    if (paragraphComponentViewClass == nil || ![view isKindOfClass:paragraphComponentViewClass]) {
        return nil;
    }

    RCTFabricWrapperPropsIMP getProps = [RCTFabricWrapper propsIMP];
    if (getProps == NULL) {
        return nil;
    }

    facebook::react::Props::Shared sharedProps = getProps(view, [RCTFabricWrapper propsSelector]);
    const rct::ParagraphProps* props = (rct::ParagraphProps*)sharedProps.get();
    if (props == nil) {
        return nil;
    }

    // Extract Attributes
    RCTTextPropertiesWrapper* textPropertiesWrapper = [[RCTTextPropertiesWrapper alloc] init];
    textPropertiesWrapper.text = [RCTFabricWrapper getTextFromView:view];
    textPropertiesWrapper.contentRect = view.bounds;

    rct::TextAttributes textAttributes = props->textAttributes;
    textPropertiesWrapper.alignment = [RCTFabricWrapper getAlignmentFromAttributes:textAttributes];
    textPropertiesWrapper.foregroundColor = [RCTFabricWrapper getForegroundColorFromAttributes:textAttributes];
    textPropertiesWrapper.fontSize = [RCTFabricWrapper getFontSizeFromAttributes:textAttributes];

    return textPropertiesWrapper;
    #else
    return nil;
    #endif
}

#if RCT_NEW_ARCH_ENABLED
+ (NSString* _Nonnull)getTextFromView:(UIView*)view {
    // `attributedText` is a plain Objective-C property on RCTParagraphComponentView, so it's
    // safe to read through KVC without importing that class's header (see the note above).
    NSAttributedString* attributedText = [view valueForKey:@"attributedText"];
    if (attributedText == nil) {
        return RCTTextPropertiesDefaultText;
    }

    return attributedText.string;
}

+ (NSTextAlignment)getAlignmentFromAttributes:(rct::TextAttributes)textAttributes {
    const rct::TextAlignment alignment = textAttributes.alignment.has_value() ?
        textAttributes.alignment.value() :
        rct::TextAlignment::Natural;

    switch (alignment) {
        case rct::TextAlignment::Natural:
            return NSTextAlignmentNatural;

        case rct::TextAlignment::Left:
            return NSTextAlignmentLeft;

        case rct::TextAlignment::Center:
            return NSTextAlignmentCenter;

        case rct::TextAlignment::Right:
            return NSTextAlignmentRight;

        case rct::TextAlignment::Justified:
            return NSTextAlignmentJustified;

        default:
            return RCTTextPropertiesDefaultAlignment;
    }
}

+ (UIColor* _Nonnull)getForegroundColorFromAttributes:(rct::TextAttributes)textAttributes {
    @try {
#if RCT_VERSION_MINOR > 73
        rct::Color color = *textAttributes.foregroundColor;
        UIColor* uiColor = (__bridge UIColor*)color.getUIColor().get();
        if (uiColor != nil) {
            return uiColor;
        }
#else
        return RCTUIColorFromSharedColor(textAttributes.foregroundColor);
#endif
    } @catch (NSException *exception) {}

    return RCTTextPropertiesDefaultForegroundColor;
}

+ (CGFloat)getFontSizeFromAttributes:(rct::TextAttributes)textAttributes {
    // Float is just an alias for CGFloat, but this could change in the future.
    _Static_assert(sizeof(rct::Float) == sizeof(CGFloat), "Float and CGFloat are expected to have the same size.");
    return isnan(textAttributes.fontSize) ? RCTTextPropertiesDefaultFontSize : (CGFloat)textAttributes.fontSize;
}
#endif
@end
