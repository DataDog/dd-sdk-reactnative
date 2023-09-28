/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-Present Datadog, Inc.
 */

import UIKit
import DatadogSessionReplay
import React

// This function is not used right now, but can be useful if we decide to 
// extract text from description
func parseRCTTextViewDescription(description: String) -> String? {
    // TODO: check performance of range for long texts, play with options
    let startIndex = description.range(of: "text: ")
    let endIndex = description.range(of: " frame =", options: .backwards)
    
    if (startIndex == nil || endIndex == nil) {
        return nil
    }
    
    let range = startIndex!.upperBound..<endIndex!.lowerBound
    
    let substr = description[range]
    return String(substr)
}

public struct RCTTextViewRecorder: NodeRecorder {
    public let uiManager: RCTUIManager
    
    public init(uiManager: RCTUIManager) {
        self.uiManager = uiManager
    }
    
    public let identifier = UUID()
    
    var textObfuscator: (ViewTreeRecordingContext, _ isSensitive: Bool) -> TextObfuscating = { context, isSensitive in
        if isSensitive {
            return context.recorder.privacy.sensitiveTextObfuscator
        }

        return context.recorder.privacy.staticTextObfuscator
    }
    
    public func semantics(of view: UIView, with attributes: ViewAttributes, in context: ViewTreeRecordingContext) -> NodeSemantics? {
        guard let textView = view as? RCTTextView else {
            return nil
        }
 
        guard let textContent = textView.textStorage().string else {
            return InvisibleElement.constant
        }

        // TODO: fix this cast
        let shadowView = uiManager.shadowView(forReactTag: textView.reactTag) as! RCTTextShadowView

        let builder = RCTTextViewWireframesBuilder(
            wireframeID: context.ids.nodeID(view: textView, nodeRecorder: self),
            attributes: attributes,
            // This relies on a change on RN to expose the textStorage.
            // We could rely on textView.accessibilityLabel or check what else we could get
            text: textContent,
            textAlignment: shadowView.textAttributes.alignment,
            textColor: shadowView.textAttributes.foregroundColor?.cgColor,
            // check this works
            font: shadowView.textAttributes.effectiveFont(),
            textObfuscator: textObfuscator(context, false),
            // this is currently incorrect
            contentRect: textView.frame
        )

        let node = Node(viewAttributes: attributes, wireframesBuilder: builder)
        return SpecificElement(subtreeStrategy: .ignore, nodes: [node])
    }
}

internal struct RCTTextViewWireframesBuilder: NodeWireframesBuilder {
    let wireframeID: WireframeID
    /// Attributes of the base `UIView`.
    let attributes: ViewAttributes
    /// The text inside text field.
    let text: String
    /// The alignment of the text.
    var textAlignment: NSTextAlignment
    /// The color of the text.
    let textColor: CGColor?
    /// The font used by the text field.
    let font: UIFont?
    /// Text obfuscator for masking text.
    let textObfuscator: TextObfuscating
    /// The frame of the text content
    let contentRect: CGRect

    var wireframeRect: CGRect {
        attributes.frame
    }
    
    private var clip: SRContentClip {
        let top = abs(contentRect.origin.y)
        let left = abs(contentRect.origin.x)
        let bottom = max(contentRect.height - attributes.frame.height - top, 0)
        let right = max(contentRect.width - attributes.frame.width - left, 0)
        return SRContentClip(
            bottom: Int64(withNoOverflow: bottom),
            left: Int64(withNoOverflow: left),
            right: Int64(withNoOverflow: right),
            top: Int64(withNoOverflow: top)
        )
    }

    private var relativeIntersectedRect: CGRect {
        // UITextView adds additional padding for presented content.
        let padding: CGFloat = 8
        return CGRect(
            x: attributes.frame.origin.x - contentRect.origin.x + padding,
            y: attributes.frame.origin.y - contentRect.origin.y + padding,
            width: max(contentRect.width, attributes.frame.width) - padding,
            height: max(contentRect.height, attributes.frame.height) - padding
        )
    }

    func buildWireframes(with builder: WireframesBuilder) -> [SRWireframe] {
        return [
            builder.createTextWireframe(
                id: wireframeID,
                frame: relativeIntersectedRect,
                text: textObfuscator.mask(text: text),
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
