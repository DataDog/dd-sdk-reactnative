/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-Present Datadog, Inc.
 */

import UIKit
@_spi(Internal) import DatadogSessionReplay
import React

//    var textObfuscator: (ViewTreeRecordingContext, _ isSensitive: Bool) -> TextObfuscating = { context, isSensitive in
//        if isSensitive {
//            return context.recorder.privacy.sensitiveTextObfuscator
//        }
//
//        return context.recorder.privacy.staticTextObfuscator
//    }

@_spi(Internal) public class RCTTextViewRecorder: SessionReplayNodeRecorder {
    public var identifier = UUID()
    
    public let uiManager: RCTUIManager
    
    public init(uiManager: RCTUIManager) {
        self.uiManager = uiManager
    }

    public func semantics(
        of view: UIView,
        with attributes: DatadogSessionReplay.SessionReplayViewAttributes,
        in context: DatadogSessionReplay.SessionReplayViewTreeRecordingContext
    ) -> DatadogSessionReplay.SessionReplayNodeSemantics? {
        guard let textView = view as? RCTTextView else {
            return nil
        }
        
        var shadowView: RCTTextShadowView? = nil
        let tag = textView.reactTag
    
        RCTGetUIManagerQueue().sync {
            shadowView = uiManager.shadowView(forReactTag: tag) as? RCTTextShadowView
        }

        if let shadow = shadowView {
            let builder = RCTTextViewWireframesBuilder(
                wireframeID: context.ids.nodeID(view: textView, nodeRecorder: self),
                attributes: attributes,
                // This relies on a change on RN to expose the textStorage.
                // We could rely on textView.accessibilityLabel or check what else we could get
                text: textView.accessibilityLabel ?? "",
                textAlignment: shadow.textAttributes.alignment,
                textColor: shadow.textAttributes.foregroundColor?.cgColor,
                // check this works
                font: shadow.textAttributes.effectiveFont(),
//                textObfuscator: textObfuscator(context, false),
                // this is currently incorrect
                contentRect: shadow.contentFrame
            )

            let node = SessionReplayNode(viewAttributes: attributes, wireframesBuilder: builder)
            return SessionReplaySpecificElement(subtreeStrategy: .ignore, nodes: [node])
        }

        return SessionReplayInvisibleElement.constant
    }
}

@_spi(Internal) public struct RCTTextViewWireframesBuilder: SessionReplayNodeWireframesBuilder {
    let wireframeID: WireframeID
    /// Attributes of the base `UIView`.
    let attributes: SessionReplayViewAttributes
    /// The text inside text field.
    let text: String
    /// The alignment of the text.
    var textAlignment: NSTextAlignment
    /// The color of the text.
    let textColor: CGColor?
    /// The font used by the text field.
    let font: UIFont?
    /// Text obfuscator for masking text.
//    let textObfuscator: TextObfuscating
    /// The frame of the text content
    let contentRect: CGRect

    public var wireframeRect: CGRect {
        attributes.frame
    }
    
    private var clip: ContentClip {
        let top = abs(contentRect.origin.y)
        let left = abs(contentRect.origin.x)
        let bottom = max(contentRect.height - attributes.frame.height - top, 0)
        let right = max(contentRect.width - attributes.frame.width - left, 0)
        return ContentClip(
            bottom: Int64(withNoOverflow: bottom),
            left: Int64(withNoOverflow: left),
            right: Int64(withNoOverflow: right),
            top: Int64(withNoOverflow: top)
        )
    }

    private var relativeIntersectedRect: CGRect {
        return CGRect(
            x: attributes.frame.origin.x - contentRect.origin.x,
            y: attributes.frame.origin.y - contentRect.origin.y ,
            width: max(contentRect.width, attributes.frame.width),
            height: max(contentRect.height, attributes.frame.height)
        )
    }

    public func buildWireframes(with builder: SessionReplayWireframesBuilder) -> [Wireframe] {
        return [
            builder.createTextWireframe(
                id: wireframeID,
                frame: relativeIntersectedRect,
//                text: textObfuscator.mask(text: text),
                text: text,
                textAlignment: .init(systemTextAlignment: textAlignment, vertical: .top),
                clip: clip,
                textColor: textColor,
                font: font,
                borderColor: attributes.layerBorderColor,
                borderWidth: attributes.layerBorderWidth,
                backgroundColor: attributes.backgroundColor,
                cornerRadius: attributes.layerCornerRadius,
                opacity: attributes.alpha
            )
        ]
    }
}
