/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNative

func mockResolve(args: Any?) {}
func mockReject(args: String?, arg: String?, err: Error?) {}

internal class DdLogsTests: XCTestCase {
    private let mockNativeLogger = MockNativeLogger()
    private lazy var logger = RNDdLogs({ self.mockNativeLogger }, { true })

    private let testMessage_swift: String = "message"
    private let testMessage_objc: NSString = "message"
    private let testErrorKind_swift: String = "error kind"
    private let testErrorKind_objc: String = "error kind"
    private let testErrorMessage_swift: String = "error message"
    private let testErrorMessage_objc: String = "error message"
    private let testErrorStacktrace_swift: String = "stacktrace"
    private let testErrorStacktrace_objc: String = "stacktrace"
    private let validTestAttributes_swift: [String: Encodable] = ["key1": "value", "key2": 123]
    private let validTestAttributes_objc = NSDictionary(
        dictionary: ["key1": "value", "key2": 123]
    )
    private let invalidTestAttributes = NSDictionary(
        dictionary: ["key1": "value", 123: "value2"]
    )
    
    private func mockResolve(args: Any?) {}
    private func mockReject(args: String?, arg: String?, err: Error?) {}

    override func setUp() {
        super.setUp()
        GlobalState.addAttribute(forKey: "global-string", value: "foo")
        GlobalState.addAttribute(forKey: "global-int", value: 42)
    }

    override func tearDown() {
        GlobalState.globalAttributes.removeAll()
        super.tearDown()
    }
 
    func testItInitializesNativeLoggerOnlyOnce() {
        // Given
        let expectation = self.expectation(description: "Initialize logger once")

        let logger = RNDdLogs({ [unowned self] in
            expectation.fulfill()
            return self.mockNativeLogger
        }, { true })

        // When
        (0..<10).forEach { _ in logger.debug(message: "foo", context: [:], resolve: mockResolve, reject: mockReject)}

        // Then
        waitForExpectations(timeout: 0.5, handler: nil)
    }

    func testLoggerDebug_validAttributes() throws {
        logger.debug(message: testMessage_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .debug)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            validTestAttributes_swift.mergeWithGlobalAttributes().keys
        )
    }

    func testLoggerInfo_validAttributes() throws {
        logger.info(message: testMessage_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .info)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            validTestAttributes_swift.mergeWithGlobalAttributes().keys
        )
    }

    func testLoggerWarn_validAttributes() throws {
        logger.warn(message: testMessage_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .warn)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            validTestAttributes_swift.mergeWithGlobalAttributes().keys
        )
    }

    func testLoggerError_validAttributes() throws {
        logger.error(message: testMessage_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .error)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            validTestAttributes_swift.mergeWithGlobalAttributes().keys
        )
    }

    func testLoggerDebug_invalidAttributes() throws {
        logger.debug(message: testMessage_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .debug)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            GlobalState.globalAttributes.keys
        )
    }

    func testLoggerInfo_invalidAttributes() throws {
        logger.info(message: testMessage_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .info)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            GlobalState.globalAttributes.keys
        )
    }

    func testLoggerWarn_invalidAttributes() throws {
        logger.warn(message: testMessage_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .warn)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            GlobalState.globalAttributes.keys
        )
    }

    func testLoggerError_invalidAttributes() throws {
        logger.error(message: testMessage_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .error)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            GlobalState.globalAttributes.keys
        )
    }

    func testLoggerDebugWithError_validAttributes() throws {
        logger.debugWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .debug)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(received.errorKind, testErrorKind_swift)
        XCTAssertEqual(received.errorMessage, testErrorMessage_swift)
        XCTAssertEqual(received.stackTrace, testErrorStacktrace_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            validTestAttributes_swift.mergeWithGlobalAttributes().keys
        )
    }

    func testLoggerDebugWithError_emptyErrorAttributes() throws {
        logger.debugWithError(message: testMessage_objc as String, errorKind: nil, errorMessage: nil, stacktrace: nil, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .debug)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(received.errorKind, nil)
        XCTAssertEqual(received.errorMessage, nil)
        XCTAssertEqual(received.stackTrace, nil)
        XCTAssertEqual(
            received.attributes?.keys,
            validTestAttributes_swift.mergeWithGlobalAttributes().keys
        )
    }

    func testLoggerInfoWithError_validAttributes() throws {
        logger.infoWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .info)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(received.errorKind, testErrorKind_swift)
        XCTAssertEqual(received.errorMessage, testErrorMessage_swift)
        XCTAssertEqual(received.stackTrace, testErrorStacktrace_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            validTestAttributes_swift.mergeWithGlobalAttributes().keys
        )
    }

    func testLoggerInfoWithError_emptyErrorAttributes() throws {
        logger.infoWithError(message: testMessage_objc as String, errorKind: nil, errorMessage: nil, stacktrace: nil, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .info)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(received.errorKind, nil)
        XCTAssertEqual(received.errorMessage, nil)
        XCTAssertEqual(received.stackTrace, nil)
        XCTAssertEqual(
            received.attributes?.keys,
            validTestAttributes_swift.mergeWithGlobalAttributes().keys
        )
    }

    func testLoggerWarnWithError_validAttributes() throws {
        logger.warnWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .warn)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(received.errorKind, testErrorKind_swift)
        XCTAssertEqual(received.errorMessage, testErrorMessage_swift)
        XCTAssertEqual(received.stackTrace, testErrorStacktrace_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            validTestAttributes_swift.mergeWithGlobalAttributes().keys
        )
    }

    func testLoggerWarnWithError_emptyErrorAttributes() throws {
        logger.warnWithError(message: testMessage_objc as String, errorKind: nil, errorMessage: nil, stacktrace: nil, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .warn)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(received.errorKind, nil)
        XCTAssertEqual(received.errorMessage, nil)
        XCTAssertEqual(received.stackTrace, nil)
        XCTAssertEqual(
            received.attributes?.keys,
            validTestAttributes_swift.mergeWithGlobalAttributes().keys
        )
    }

    func testLoggerErrorWithError_validAttributes() throws {
        logger.errorWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .error)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(received.errorKind, testErrorKind_swift)
        XCTAssertEqual(received.errorMessage, testErrorMessage_swift)
        XCTAssertEqual(received.stackTrace, testErrorStacktrace_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            validTestAttributes_swift.mergeWithGlobalAttributes().keys
        )
    }

    func testLoggerErrorWithError_emptyErrorAttributes() throws {
        logger.errorWithError(message: testMessage_objc as String, errorKind: nil, errorMessage: nil, stacktrace: nil, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .error)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(received.errorKind, nil)
        XCTAssertEqual(received.errorMessage, nil)
        XCTAssertEqual(received.stackTrace, nil)
        XCTAssertEqual(
            received.attributes?.keys,
            validTestAttributes_swift.mergeWithGlobalAttributes().keys
        )
    }

    func testLoggerDebugWithError_invalidAttributes() throws {
        logger.debugWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .debug)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            GlobalState.globalAttributes.keys
        )
    }

    func testLoggerInfoWithError_invalidAttributes() throws {
        logger.infoWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .info)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            GlobalState.globalAttributes.keys
        )
    }

    func testLoggerWarnWithError_invalidAttributes() throws {
        logger.warnWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .warn)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            GlobalState.globalAttributes.keys
        )
    }

    func testLoggerErrorWithError_invalidAttributes() throws {
        logger.errorWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 1)
        let received = try XCTUnwrap(mockNativeLogger.receivedMethodCalls.first)
        XCTAssertEqual(received.kind, .error)
        XCTAssertEqual(received.message, testMessage_swift)
        XCTAssertEqual(
            received.attributes?.keys,
            GlobalState.globalAttributes.keys
        )
    }
    
    func testDoesNotInitializeLoggerBeforeSdkIsInitialized() throws {
        var isInitialized = false
        let newLogger = RNDdLogs({ self.mockNativeLogger }, { isInitialized })
        
        newLogger.debug(message: testMessage_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)
        newLogger.info(message: testMessage_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)
        newLogger.warn(message: testMessage_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)
        newLogger.error(message: testMessage_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)
        newLogger.debugWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)
        newLogger.infoWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)
        newLogger.warnWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)
        newLogger.errorWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 0)

        isInitialized = true
        
        newLogger.debug(message: testMessage_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)
        newLogger.info(message: testMessage_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)
        newLogger.warn(message: testMessage_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)
        newLogger.error(message: testMessage_objc as String, context: validTestAttributes_objc, resolve: mockResolve, reject: mockReject)
        newLogger.debugWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)
        newLogger.infoWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)
        newLogger.warnWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)
        newLogger.errorWithError(message: testMessage_objc as String, errorKind: testErrorKind_objc as String, errorMessage: testErrorMessage_objc as String, stacktrace: testErrorStacktrace_objc as String, context: invalidTestAttributes, resolve: mockResolve, reject: mockReject)

        XCTAssertEqual(mockNativeLogger.receivedMethodCalls.count, 8)
    }
}

private class MockNativeLogger: NativeLogger {
    struct MethodCall {
        enum Kind {
            case debug
            case info
            case warn
            case error
        }
        let kind: Kind
        let message: String
        let errorKind: String?
        let errorMessage: String?
        let stackTrace: String?
        let attributes: [String: Encodable]?
    }
    private(set) var receivedMethodCalls = [MethodCall]()

    func debug(_ message: String, error: Error?, attributes: [String: Encodable]?) {
        receivedMethodCalls.append(MethodCall(kind: .debug, message: message, errorKind: nil, errorMessage: nil, stackTrace: nil, attributes: attributes))
    }
    func debug(_ message: String, errorKind: String?, errorMessage: String?, stackTrace: String?, attributes: [String: Encodable]?) {
        receivedMethodCalls.append(MethodCall(kind: .debug, message: message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stackTrace, attributes: attributes))
    }
    func info(_ message: String, error: Error?, attributes: [String: Encodable]?) {
        receivedMethodCalls.append(MethodCall(kind: .info, message: message, errorKind: nil, errorMessage: nil, stackTrace: nil, attributes: attributes))
    }
    func info(_ message: String, errorKind: String?, errorMessage: String?, stackTrace: String?, attributes: [String: Encodable]?) {
        receivedMethodCalls.append(MethodCall(kind: .info, message: message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stackTrace, attributes: attributes))
    }
    func warn(_ message: String, error: Error?, attributes: [String: Encodable]?) {
        receivedMethodCalls.append(MethodCall(kind: .warn, message: message, errorKind: nil, errorMessage: nil, stackTrace: nil, attributes: attributes))
    }
    func warn(_ message: String, errorKind: String?, errorMessage: String?, stackTrace: String?, attributes: [String: Encodable]?) {
        receivedMethodCalls.append(MethodCall(kind: .warn, message: message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stackTrace, attributes: attributes))
    }
    func error(_ message: String, error: Error?, attributes: [String: Encodable]?) {
        receivedMethodCalls.append(MethodCall(kind: .error, message: message, errorKind: nil, errorMessage: nil, stackTrace: nil, attributes: attributes))
    }
    func error(_ message: String, errorKind: String?, errorMessage: String?, stackTrace: String?, attributes: [String: Encodable]?) {
        receivedMethodCalls.append(MethodCall(kind: .error, message: message, errorKind: errorKind, errorMessage: errorMessage, stackTrace: stackTrace, attributes: attributes))
    }
}
