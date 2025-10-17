/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
@_spi(Internal)
import DatadogSessionReplay
import DatadogInternal
import DatadogSDKReactNative
import UIKit
import React


private enum SVGConstants {
    static let attributes = "attributes"
    static let width = "width"
    static let height = "height"
    static let hash = "hash"
    static let type = "type"
    static let svgTypeValue = "svg"
}

internal struct ReactNativeSVGResource: SessionReplayResource {
    let identifier: String
    let svgContent: String
    let mimeType: String = "image/svg+xml"
    
    init(id: String, svgContent: String) {
        self.identifier = id
        self.svgContent = svgContent
    }
    
    func calculateIdentifier() -> String {
        return identifier
    }
    
    func calculateData() -> Data {
        return svgContent.data(using: .utf8) ?? Data()
    }
}


internal class SvgViewRecorder: SessionReplayNodeRecorder {
    internal var identifier = UUID()
    
    internal let uiManager: RCTUIManager
    internal let fabricWrapper: RCTFabricWrapper
    internal let svgMap: [String: SVGData]
    
    internal init(uiManager: RCTUIManager, fabricWrapper: RCTFabricWrapper, svgMap: [String: SVGData]) {
        self.uiManager = uiManager
        self.fabricWrapper = fabricWrapper
        self.svgMap = svgMap
    }
    
    func semantics(
        of view: UIView,
        with attributes: SessionReplayViewAttributes,
        in context: SessionReplayViewTreeRecordingContext
    ) -> SessionReplayNodeSemantics? {
        
        guard view.accessibilityIdentifier != nil else {
            return nil
        }
        
        guard let attrs = view.value(forKey: SVGConstants.attributes) as? [String: String] else {
            return nil
        }
        
        guard let type = attrs[SVGConstants.type], type == "svg" else {
            return nil
        }
        
        guard let hash = attrs[SVGConstants.hash] else {
            return nil
        }
        
        let bundle = Bundle(for: SvgViewRecorder.self)
        guard let url = bundle.url(forResource: "assets", withExtension: "bin") else {
            return nil
        }
        
        guard let subView = view.subviews.first else {
            return nil
        }
        
        
        let viewId = context.ids.nodeID(view: view, nodeRecorder: self)
        let svgId = context.ids.nodeID(view: subView, nodeRecorder: self)
        
        do {
            guard let svgInfo = svgMap[hash] else {
                return nil
            }
            
            let fileHandle = try FileHandle(forReadingFrom: url)
            defer { try? fileHandle.close() }
            
            try fileHandle.seek(toOffset: UInt64(svgInfo.offset))
            let svgDataChunk = try fileHandle.read(upToCount: svgInfo.length)
            
            guard let svgDataChunk = svgDataChunk,
                  var svgData = String(data: svgDataChunk, encoding: .utf8) else {
                return nil
            }
            
            if let updatedSvgData = handleDynamicSvgDimensions(view: subView, svgData: svgData, attrs: attrs) {
                svgData = updatedSvgData
            }
            
            let svgResource = ReactNativeSVGResource(
                id: hash,
                svgContent: svgData
            )
            
            let contentFrame = CGRect(
                origin: attributes.frame.origin,
                size: CGSize(width: subView.bounds.width,
                             height: subView.bounds.height)
            )
            
            let builder = SvgViewWireframesBuilder(
                wireframeID: viewId,
                imageWireframeID: svgId,
                attributes: attributes,
                contentFrame: contentFrame,
                svgResource: svgResource,
                imagePrivacyLevel: context.recorder.imagePrivacy
            )
            
            // Children are ignored because they were already processed and converted by the babel plugin
            let element = SessionReplaySpecificElement(subtreeStrategy: .ignore, nodes: [
                SessionReplayNode(viewAttributes: attributes, wireframesBuilder: builder)
            ])
            
            return element
        } catch {
            return nil
        }
    }
}

func handleDynamicSvgDimensions(view: UIView, svgData: String, attrs: [String: String]) -> String? {
    let width = attrs[SVGConstants.width] ?? ""
    let height = attrs[SVGConstants.height] ?? ""
    
    var svgAttributes: [String] = []
    
    if width.isEmpty {
        svgAttributes.append(#"width="\#(Int(view.bounds.width))""#)
    }
    
    if height.isEmpty {
        svgAttributes.append(#"height="\#(Int(view.bounds.height))""#)
    }
    
    if !svgAttributes.isEmpty {
        // Here we update the svg content but keep the original hash without these values
        // The goal is to save some time, as it won't matter since the hash is used as an identifier
        var svg = svgData
        let pattern = #"<svg[^>]*>"#
        
        if let match = svg.range(of: pattern, options: .regularExpression) {
            let dimensions = " " + svgAttributes.joined(separator: " ")
            
            if let closingBracketRange = svg.range(of: ">", range: match.lowerBound..<match.upperBound) {
                svg.replaceSubrange(closingBracketRange, with: dimensions + ">")
                return svg
            }
        }
        
    }
    
    return nil
}


internal struct SvgViewWireframesBuilder: SessionReplayNodeWireframesBuilder {
    let wireframeID: WireframeID
    
    var wireframeRect: CGRect {
        attributes.frame
    }
    
    let imageWireframeID: WireframeID
    
    let attributes: SessionReplayViewAttributes
    
    let contentFrame: CGRect?
    
    let svgResource: ReactNativeSVGResource?
    
    let imagePrivacyLevel: ImagePrivacyLevel
    
    func buildWireframes(with builder: SessionReplayWireframesBuilder) -> [SRWireframe] {
        var wireframes = [
            builder.createShapeWireframe(
                id: wireframeID,
                frame: attributes.frame,
                clip: attributes.clip,
                borderColor: attributes.layerBorderColor,
                borderWidth: attributes.layerBorderWidth,
                backgroundColor: attributes.backgroundColor,
                cornerRadius: attributes.layerCornerRadius,
                opacity: attributes.alpha
            )
        ]
        
        if let svgResource {
            wireframes.append(
                builder.createImageWireframe(
                    id: imageWireframeID,
                    resource: svgResource,
                    frame: contentFrame ?? attributes.frame,
                    clip: attributes.clip
                )
            )
        }
        
        return wireframes
    }
}
