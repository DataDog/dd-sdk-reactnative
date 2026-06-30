/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import XCTest

enum NativeFfeTestFixtures {
    static func jsonObject(_ relativePath: String) throws -> [String: Any] {
        let fixture = try readString(relativePath)
        let data = try XCTUnwrap(fixture.data(using: .utf8))
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    static func jsonArray(_ relativePath: String) throws -> [Any] {
        let fixture = try readString(relativePath)
        let data = try XCTUnwrap(fixture.data(using: .utf8))
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [Any])
    }

    static func readString(_ relativePath: String) throws -> String {
        let bundle = Bundle(for: BundleToken.self)
        let candidates = [
            "__fixtures__/\(relativePath)",
            relativePath,
        ]
        for candidate in candidates {
            let nsPath = candidate as NSString
            let resourcePath = nsPath.deletingPathExtension
            let resourceExtension = nsPath.pathExtension.isEmpty ? "json" : nsPath.pathExtension
            if let url = bundle.url(forResource: resourcePath, withExtension: resourceExtension) {
                return try String(contentsOf: url, encoding: .utf8)
            }
        }

        let sourceFile = URL(fileURLWithPath: #filePath)
        let packageRoot = sourceFile
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let localFixture = packageRoot
            .appendingPathComponent("src/flags/__fixtures__")
            .appendingPathComponent(relativePath)
        return try String(contentsOf: localFixture, encoding: .utf8)
    }

    private final class BundleToken {}
}
