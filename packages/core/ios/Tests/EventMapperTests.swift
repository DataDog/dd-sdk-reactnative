/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2021 Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNative
@testable import Datadog

class EventMapperTests: XCTestCase {
    func testMappedLogNoExtraInfo() throws {
        let mockLogEvent = LogEvent.mockAny()
        let mappedEvent = logEventMapper(event: mockLogEvent)
        try AssertEncodedRepresentationsEqual(mockLogEvent, mappedEvent)
    }

    func testMappedLogWithExtraInfo() throws {
        let mockLogEvent = LogEvent.mockWith(attributes: LogEvent.Attributes.mockWith(userAttributes: [LogMapperAttributes.extraUserInfo: ["someKey": "someValue"]]))
        let mappedEvent = logEventMapper(event: mockLogEvent)

        let result = LogEvent.mockWith(userInfo: LogEvent.UserInfo(id: nil, name: nil, email:nil, extraInfo: ["someKey": "someValue"]))

        try AssertEncodedRepresentationsEqual(result, mappedEvent)
    }
}
