/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNativeSessionReplay
@_spi(Internal)
@testable import DatadogSessionReplay
import React

internal class RCTTextViewRecorderTests: XCTestCase {
    let mockAttributes = SessionReplayViewAttributes(
        frame: CGRect(x: 0, y: 0, width: 100, height: 100),
        backgroundColor: UIColor.white.cgColor,
        layerBorderColor: UIColor.blue.cgColor,
        layerBorderWidth: CGFloat(1.0),
        layerCornerRadius: CGFloat(1.0),
        alpha: CGFloat(1.0),
        isHidden: false,
        intrinsicContentSize: CGSize(width: 100.0, height: 100.0)
    )
    
    let mockAllowContext = SessionReplayViewTreeRecordingContext(
        recorder: .init(privacy: SessionReplayPrivacyLevel.allow, applicationID: "app_id", sessionID: "session_id", viewID: "view_id", viewServerTimeOffset: nil),
        coordinateSpace: UIView(),
        ids: .init(),
        imageDataProvider: ImageDataProvider()
    )
    
    var mockShadowView: RCTTextShadowView {
        // The shadow view must be initialized with a bridge so that we can insert React Subviews into it.
        let shadowView: RCTTextShadowView = .init(bridge: MockRCTBridge(delegate: .none));
        
        let rawTextShadowView = RCTRawTextShadowView()
        rawTextShadowView.text = "This is the test text."
        shadowView.insertReactSubview(rawTextShadowView, at: 0)
        
        return shadowView
    }
    
    var mockShadowViewNestedText: RCTTextShadowView {
        // The shadow view must be initialized with a bridge so that we can insert React Subviews into it.
        let shadowView: RCTTextShadowView = .init(bridge: MockRCTBridge(delegate: .none));
        
        let rawTextShadowView = RCTRawTextShadowView()
        rawTextShadowView.text = "This is the "
        shadowView.insertReactSubview(rawTextShadowView, at: 0)
        
        let virtualTextShadowView = RCTVirtualTextShadowView()
        let nestedRawTextShadowView = RCTRawTextShadowView()
        nestedRawTextShadowView.text = "nested test text."
        virtualTextShadowView.insertReactSubview(nestedRawTextShadowView, at: 0)
        shadowView.insertReactSubview(virtualTextShadowView, at: 1)
        
        return shadowView
    }
 
    func testReturnsNilIfViewIsNotRCTTextView() {
        let viewMock = UIView()
        let uiManagerMock = MockUIManager()
        let viewRecorder = RCTTextViewRecorder(uiManager: uiManagerMock)
        
        let result = viewRecorder.semantics(of: viewMock, with: mockAttributes, in: mockAllowContext)
        
        XCTAssertNil(result)
    }
    
    func testReturnsInvisibleElementIfShadowViewIsNotFound() throws {
        let reactTag = NSNumber(value: 44)
        let uiManagerMock = MockUIManager()
        let viewMock = RCTTextView()
        viewMock.reactTag = reactTag
        let viewRecorder = RCTTextViewRecorder(uiManager: uiManagerMock)

        let result = viewRecorder.semantics(of: viewMock, with: mockAttributes, in: mockAllowContext)

        let element = try XCTUnwrap(result as? SessionReplayInvisibleElement)
        XCTAssertEqual(element, SessionReplayInvisibleElement.constant)
    }
    
    func testReturnsBuilderWithCorrectInformation() throws {
        let reactTag = NSNumber(value: 44)
        let uiManagerMock = MockUIManager(reactTag: reactTag, shadowView: mockShadowView)
        let viewMock = RCTTextView()
        viewMock.reactTag = reactTag
        let viewRecorder = RCTTextViewRecorder(uiManager: uiManagerMock)

        let result = viewRecorder.semantics(of: viewMock, with: mockAttributes, in: mockAllowContext)

        let element = try XCTUnwrap(result as? SessionReplaySpecificElement)
        XCTAssertEqual(element.subtreeStrategy, .ignore)
        XCTAssertEqual(element.nodes.count, 1)
        let wireframe = try XCTUnwrap(element.nodes[0].wireframesBuilder.buildWireframes(with: .init())[0].getAsTextWireframe())
        XCTAssertEqual(wireframe.text, "This is the test text.")
    }
    
    func testReturnsBuilderWithCorrectInformationWhenNestedTextComponents() throws {
        let reactTag = NSNumber(value: 44)
        let uiManagerMock = MockUIManager(reactTag: reactTag, shadowView: mockShadowViewNestedText)
        let viewMock = RCTTextView()
        viewMock.reactTag = reactTag
        let viewRecorder = RCTTextViewRecorder(uiManager: uiManagerMock)

        let result = viewRecorder.semantics(of: viewMock, with: mockAttributes, in: mockAllowContext)

        let element = try XCTUnwrap(result as? SessionReplaySpecificElement)
        XCTAssertEqual(element.subtreeStrategy, .ignore)
        XCTAssertEqual(element.nodes.count, 1)
        let wireframe = try XCTUnwrap(element.nodes[0].wireframesBuilder.buildWireframes(with: .init())[0].getAsTextWireframe())
        XCTAssertEqual(wireframe.text, "This is the nested test text.")
    }
    
    func testReturnsBuilderWithCorrectInformationWhenTextIsObfuscated() throws {
        let mockMaskContext = SessionReplayViewTreeRecordingContext(
            recorder: .init(privacy: SessionReplayPrivacyLevel.mask, applicationID: "app_id", sessionID: "session_id", viewID: "view_id", viewServerTimeOffset: nil),
            coordinateSpace: UIView(),
            ids: .init(),
            imageDataProvider: ImageDataProvider()
        )
        let reactTag = NSNumber(value: 44)
        let uiManagerMock = MockUIManager(reactTag: reactTag, shadowView: mockShadowView)
        let viewMock = RCTTextView()
        viewMock.reactTag = reactTag
        let viewRecorder = RCTTextViewRecorder(uiManager: uiManagerMock)

        let result = viewRecorder.semantics(of: viewMock, with: mockAttributes, in: mockMaskContext)

        let element = try XCTUnwrap(result as? SessionReplaySpecificElement)
        XCTAssertEqual(element.subtreeStrategy, .ignore)
        XCTAssertEqual(element.nodes.count, 1)
        let wireframe = try XCTUnwrap(element.nodes[0].wireframesBuilder.buildWireframes(with: .init())[0].getAsTextWireframe())
        XCTAssertEqual(wireframe.text, "xxxx xx xxx xxxx xxxxx")
    }
}

private class MockRCTTextView: RCTTextView {}

private class MockUIManager: RCTUIManager {
    /// Tag to be used in the test corresponding to a shadow view
    var shadowViewTag: NSNumber? = nil
    var shadowView: RCTTextShadowView? = nil
    
    convenience init(reactTag: NSNumber, shadowView: RCTTextShadowView?) {
        self.init()
        self.shadowViewTag = reactTag
        self.shadowView = shadowView
    }

    internal override func shadowView(forReactTag: NSNumber) -> RCTShadowView? {
        if (forReactTag == shadowViewTag) {
            return shadowView
        }
        return nil
    }
    
}

extension SessionReplayInvisibleElement: Equatable {
    public static func ==(lhs: SessionReplayInvisibleElement, rhs: SessionReplayInvisibleElement) -> Bool {
        // If two elements are indeed InvisibleElement they're InvisibleElement.constant
        return true
    }
}

extension SRWireframe {
    public func getAsTextWireframe() -> SRTextWireframe? {
        if case .textWireframe(let value) = self {
            return value
        }
        return nil
    }
}

private class MockRCTBridge: RCTBridge {
    /// We need to override this function that would otherwise try to setup
    /// a real bridge and fail as we don't have a bundled JS.
    override func setUp() {
        // do nothing
    }
}
