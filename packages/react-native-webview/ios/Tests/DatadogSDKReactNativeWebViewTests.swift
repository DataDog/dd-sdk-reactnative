/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNativeWebView
@testable import DatadogSDKReactNative
@testable import DatadogWebViewTracking
import DatadogInternal
import React
import DatadogLogs
import DatadogCore

internal class DatadogSDKReactNativeWebViewTests: XCTestCase {
    override func setUp() {
        super.setUp()
        let mockDatadogCore = MockDatadogCore()
        DatadogSDKWrapper.shared.setCoreInstance(core: mockDatadogCore)
    }
    
    func testDatadogWebViewManagerReturnsDatadogWebView() {
        // Given
        let viewManager = RCTDatadogWebViewManager()
        // When
        let view = viewManager.view()
        // Then
        XCTAssertTrue(view is RCTDatadogWebView, "ViewManager returned view is of type RCTDatadogWebView")
    }
    
    func testDatadogWebViewTrackingIsDisabledOnInit() {
        // Given
        let viewManager = RCTDatadogWebViewManager()
        // When
        guard let view = viewManager.view() as? RCTDatadogWebView else {
            XCTFail()
            return
        }
        // Then
        XCTAssertFalse(view.isTrackingEnabled)
    }
    
    func testDatadogWebViewTrackingIsDisabledIfCoreIsNotReady() {
        // Given
        DatadogSDKWrapper.shared.setCoreInstance(core: nil)
        let viewManager = RCTDatadogWebViewManager()
        let allowedHosts = NSArray(objects: "example1.com", "example2.com")

        // When
        guard let view = viewManager.view() as? RCTDatadogWebView else {
            XCTFail()
            return
        }
        // Given
        let selector = NSSelectorFromString("setupDatadogWebView:view:")
        XCTAssertTrue(viewManager.responds(to: selector))

        // When
        viewManager.perform(selector, with: allowedHosts, with: view)

        // Then
        XCTAssertEqual(allowedHosts.count, 2)
        XCTAssertTrue(allowedHosts.contains("example1.com"))
        XCTAssertTrue(allowedHosts.contains("example2.com"))


        // Then
        XCTAssertFalse(view.isTrackingEnabled)
    }
    
    func testDatadogWebViewTrackingIsEnabledLateWhenCoreIsNotReady() {
        // Given
        let viewManager = RCTDatadogWebViewManager()
        let allowedHosts = NSArray(objects: "example1.com", "example2.com")

        // When
        guard let view = viewManager.view() as? RCTDatadogWebView else {
            XCTFail()
            return
        }

        view.addSubview(WKWebView())

        DatadogSDKWrapper.shared.setCoreInstance(core: nil)

        // Given
        let selector = NSSelectorFromString("setupDatadogWebView:view:")
        XCTAssertTrue(viewManager.responds(to: selector))
        viewManager.perform(selector, with: allowedHosts, with: view)

        XCTAssertFalse(view.isTrackingEnabled)

        // When
        DatadogSDKWrapper.shared.setCoreInstance(core: MockDatadogCore())
        DatadogSDKWrapper.shared.callInitialize()

        let expectation = self.expectation(description: "WebView tracking is enabled through the listener.")
        DispatchQueue.main.async {
            expectation.fulfill()
        }

        // Then
        wait(for: [expectation], timeout: 6)
        XCTAssertTrue(view.isTrackingEnabled)
    }
    
    func testDatadogWebViewTrackingIsEnabledWhenCoreIsReady() {
        // Given
        let viewManager = RCTDatadogWebViewManager()
        let allowedHosts = NSArray(objects: "example1.com", "example2.com")

        // When
        guard let view = viewManager.view() as? RCTDatadogWebView else {
            XCTFail()
            return
        }

        view.addSubview(WKWebView())

        XCTAssertFalse(view.isTrackingEnabled)

        // Given
        let selector = NSSelectorFromString("setupDatadogWebView:view:")
        XCTAssertTrue(viewManager.responds(to: selector))
        viewManager.perform(selector, with: allowedHosts, with: view)

        let expectation = self.expectation(description: "WebView tracking is enabled in the main thread")
        DispatchQueue.main.async {
            expectation.fulfill()
        }

        // Then
        wait(for: [expectation], timeout: 6)
        // When
        XCTAssertTrue(view.isTrackingEnabled)
    }

    func testDatadogWebViewJavascriptEnabled() {
        // Given
        let viewManager = RCTDatadogWebViewManager()
        // When
        guard let view = viewManager.view() as? RCTDatadogWebView else {
            XCTFail()
            return
        }
        // Then
        XCTAssertTrue(view.javaScriptEnabled)
    }
    
    func testDatadogWebViewAllowedHostsAreEmptyOnInit() {
        // Given
        let viewManager = RCTDatadogWebViewManager()
        // Then
        guard let allowedHosts = viewManager.value(forKey: "allowedHosts") as? NSMutableSet else {
            XCTFail("DatadogWebViewManager must have 'allowedHosts' property.")
            return
        }
        XCTAssertEqual(allowedHosts.count, 0)
    }
    
    func testDatadogWebViewDelegatesAreSetOnInit() {
        // Given
        let viewManager = RCTDatadogWebViewManager()
        // When
        guard let view = viewManager.view() as? RCTDatadogWebView else {
            XCTFail()
            return
        }
        // Then
        XCTAssert(view.ddWebViewDelegate.isEqual(viewManager))
        XCTAssertNotNil(view.delegate)
        XCTAssert(view.delegate!.isEqual(viewManager))
    }
 
    func testDatadogWebViewAllowedHostsAreSet() {
        // Given
        let allowedHosts = NSArray(objects: "example1.com", "example2.com")
        let viewManager = RCTDatadogWebViewManager()

        guard let view = viewManager.view() as? RCTDatadogWebView else {
            XCTFail("ViewManager view is not of type RCTDatadogWebView")
            return
        }

        let selector = NSSelectorFromString("setupDatadogWebView:view:")
        XCTAssertTrue(viewManager.responds(to: selector))

        // When
        viewManager.perform(selector, with: allowedHosts, with: view)

        // Then
        XCTAssertEqual(allowedHosts.count, 2)
        XCTAssertTrue(allowedHosts.contains("example1.com"))
        XCTAssertTrue(allowedHosts.contains("example2.com"))
    }
    
    func testDatadogWebViewDelegateIsCalledWhenViewMovedToWindow() {
        // Given
        let viewManager = RCTDatadogWebViewManager()

        guard let view = viewManager.view() as? RCTDatadogWebView else {
            XCTFail("ViewManager view is not of type RCTDatadogWebView")
            return
        }

        let delegate = MockDatadogWebViewDelegate()
        view.ddWebViewDelegate = delegate

        XCTAssertFalse(delegate.wasCalled)

        // When
        view.didMoveToWindow()

        // Then
        XCTAssertTrue(delegate.wasCalled)
    }
    
    func testDatadogWebViewCanFindNestedWKWebView() {
        // Given
        let viewManager = RCTDatadogWebViewManager()

        guard let view = viewManager.view() as? RCTDatadogWebView else {
            XCTFail("ViewManager view is not of type RCTDatadogWebView")
            return
        }

        let container = UIView()
        container.addSubview(WKWebView())
        view.addSubview(container)

        // When
        let selector = NSSelectorFromString("findWKWebViewInView:")
        XCTAssertTrue(view.responds(to: selector))
        let wkWebView = view.perform(selector, with: view)

        // Then
        XCTAssertNotNil(wkWebView)
        XCTAssertTrue(wkWebView?.takeUnretainedValue() is WKWebView)
    }
}

extension DatadogSDKWrapper {
    func callInitialize() {
        self.initialize(
            coreConfiguration: Datadog.Configuration(clientToken: "mock-client-token", env: "mock-env"),
            loggerConfiguration: DatadogLogs.Logger.Configuration(),
            trackingConsent: TrackingConsent.granted)
    }
}

private class MockDatadogWebViewDelegate: NSObject, RCTDatadogWebViewDelegate {
    var wasCalled = false
    func didCreateWebView(_ webView: RCTDatadogWebView!) {
        self.wasCalled = true
    }
}

private class MockDatadogCore: DatadogCoreProtocol {
    func mostRecentModifiedFileAt(before: Date) throws -> Date? {
        return nil
    }
    
    func scope<T>(for featureType: T.Type) -> any DatadogInternal.FeatureScope where T : DatadogInternal.DatadogFeature {
        return NOPFeatureScope()
    }
    
    func feature<T>(named name: String, type: T.Type) -> T? {
        return nil
    }

    func register<T>(feature: T) throws where T : DatadogInternal.DatadogFeature {}
    func send(message: DatadogInternal.FeatureMessage, else fallback: @escaping () -> Void) {}
    func set(baggage: @escaping () -> DatadogInternal.FeatureBaggage?, forKey key: String) {}
}
