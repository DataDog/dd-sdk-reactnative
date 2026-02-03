/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-Present Datadog, Inc.
 */

@_spi(Internal) import DatadogSessionReplay
import React
import UIKit

internal class RCTTextViewRecorder: SessionReplayNodeRecorder {
    internal var textObfuscator:
        (SessionReplayViewTreeRecordingContext, SessionReplayViewAttributes) ->
            SessionReplayTextObfuscating = { context, viewAttributes in
                return viewAttributes.resolveTextAndInputPrivacyLevel(in: context)
                    .staticTextObfuscator
            }

    internal var identifier = UUID()

    internal let uiManager: RCTUIManager
    internal let fabricWrapper: RCTFabricWrapper
    private let textExtractor: RCTTextExtractor

    internal init(uiManager: RCTUIManager, fabricWrapper: RCTFabricWrapper) {
        self.uiManager = uiManager
        self.fabricWrapper = fabricWrapper
        self.textExtractor = RCTTextExtractor()
    }

    public func semantics(
        of view: UIView,
        with attributes: SessionReplayViewAttributes,
        in context: SessionReplayViewTreeRecordingContext
    ) -> SessionReplayNodeSemantics? {
        guard
            let textProperties = fabricWrapper.tryToExtractTextProperties(from: view)
                ?? textExtractor.tryToExtractTextProperties(from: view, with: uiManager)
        else {
            // Check if this is an RCTTextView that we couldn't extract text from
            // This check is done in Objective-C to avoid compile-time dependency on RCTTextView
            return textExtractor.isRCTTextView(view) ? SessionReplayInvisibleElement.constant : nil
        }

        let builder = RCTTextViewWireframesBuilder(
            wireframeID: context.ids.nodeID(view: view, nodeRecorder: self),
            attributes: attributes,
            text: textProperties.text,
            textAlignment: textProperties.alignment,
            textColor: textProperties.foregroundColor,
            textObfuscator: textObfuscator(context, attributes),
            fontSize: textProperties.fontSize,
            contentRect: textProperties.contentRect
        )

        return SessionReplaySpecificElement(
            subtreeStrategy: .ignore,
            nodes: [
                SessionReplayNode(viewAttributes: attributes, wireframesBuilder: builder)
            ])
    }

}

internal struct RCTTextViewWireframesBuilder: SessionReplayNodeWireframesBuilder {
    let wireframeID: WireframeID
    let attributes: SessionReplayViewAttributes
    let text: String
    var textAlignment: NSTextAlignment
    let textColor: UIColor
    let textObfuscator: SessionReplayTextObfuscating
    let fontSize: CGFloat
    let contentRect: CGRect

    public var wireframeRect: CGRect {
        attributes.frame
    }

    // Clipping should be 0 to avoid the text from overflowing when the
    // numberOfLines prop is used.
    // To apply clip(0 0 0 0) we set a negative clipping (which has no effect).
    // TODO: RUM-2354 remove this when clip(0 0 0 0) is applied
    private var clip: SRContentClip {
        let top = -1.0
        let left = 0.0
        let bottom = 0.0
        let right = 0.0
        return SRContentClip.create(
            bottom: Int64.ddWithNoOverflow(bottom),
            left: Int64.ddWithNoOverflow(left),
            right: Int64.ddWithNoOverflow(right),
            top: Int64.ddWithNoOverflow(top)
        )
    }

    private var relativeIntersectedRect: CGRect {
        return CGRect(
            x: attributes.frame.origin.x,
            y: attributes.frame.origin.y,
            width: max(contentRect.width, attributes.frame.width),
            height: max(contentRect.height, attributes.frame.height)
        )
    }

    private var textFrame: CGRect {
        return CGRect(
            x: attributes.frame.origin.x + contentRect.origin.x,
            y: attributes.frame.origin.y + contentRect.origin.y,
            width: contentRect.width,
            height: contentRect.height
        )
    }

    public func buildWireframes(with builder: SessionReplayWireframesBuilder) -> [SRWireframe] {
        return [
            builder.createTextWireframe(
                id: wireframeID,
                frame: relativeIntersectedRect,
                clip: attributes.clip,
                text: textObfuscator.mask(text: text),
                textFrame: textFrame,
                // Text alignment is top for all RCTTextView and RCTParagraphComponentView components.
                textAlignment: .init(systemTextAlignment: textAlignment, vertical: .top),
                textColor: textColor.cgColor,
                fontOverride: SessionReplayWireframesBuilder.FontOverride(
                    size: fontSize.isNaN ? RCTTextPropertiesDefaultFontSize : fontSize),
                borderColor: attributes.layerBorderColor,
                borderWidth: attributes.layerBorderWidth,
                backgroundColor: attributes.backgroundColor,
                cornerRadius: attributes.layerCornerRadius,
                opacity: attributes.alpha
            )
        ]
    }
}
