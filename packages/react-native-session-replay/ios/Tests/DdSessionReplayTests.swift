/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import XCTest

internal class DdSessionReplayTests: XCTestCase {
    private lazy var sessionReplay = DdSessionReplayImplementation()
    
    private func mockResolve(args: Any?) {}
    private func mockReject(args: String?, arg: String?, err: Error?) {}
 
    func testDoesNothing() {
        sessionReplay.enable(replaySampleRate: 100, defaultPrivacyLevel: "MASK", resolve: mockResolve, reject: mockReject)
    }
}
