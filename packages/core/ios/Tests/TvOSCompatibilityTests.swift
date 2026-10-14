/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import XCTest

/// `DatadogWebViewTracking` and the `consumeWebviewEvent` bridge method are iOS-only in our own
/// code. This used to also be true one level down: the podspec's `s.ios.dependency
/// 'DatadogWebViewTracking'` meant the pod dependency itself was never pulled in on tvOS. Now that
/// the native SDK is resolved through SwiftPM, `spm_dependency` cannot be scoped per platform (see
/// the podspec), so the product is requested unconditionally instead. Confirmed with a standalone
/// scratch SPM package (outside this repo, since it has no tvOS build target of its own) that
/// `DatadogWebViewTracking` 3.16.0 itself still compiles cleanly for tvOS -- but that only checks
/// dd-sdk-ios's own product in isolation, not this whole pod (React-Core, the FRAMEWORK_SEARCH_PATHS
/// and OTHER_LDFLAGS workarounds in the podspec, ...) built and linked for tvOS end to end.
///
/// This test statically enforces that every reference to these symbols in `Sources` is wrapped in
/// a platform guard (`#if os(iOS)` for Swift, `#if TARGET_OS_IOS` for Objective-C++), as a
/// lightweight substitute for an actual tvOS build. It only covers our own code, not whether the
/// dependency resolves for tvOS in the first place.
final class TvOSCompatibilityTests: XCTestCase {
    private static let iOSOnlySymbols = ["DatadogWebViewTracking", "WebViewTracking", "consumeWebviewEvent"]

    private static let swiftGuardPattern = "os(iOS)"
    private static let objcGuardPattern = "TARGET_OS_IOS"

    func testIOSOnlySymbolsAreGuardedInSwiftSources() throws {
        for url in try swiftSourceFiles() {
            try assertSymbolsAreGuarded(
                in: url,
                guardPattern: Self.swiftGuardPattern
            )
        }
    }

    func testIOSOnlySymbolsAreGuardedInObjectiveCSources() throws {
        for url in try objectiveCSourceFiles() {
            try assertSymbolsAreGuarded(
                in: url,
                guardPattern: Self.objcGuardPattern
            )
        }
    }

    // MARK: - Helpers

    private func assertSymbolsAreGuarded(in url: URL, guardPattern: String) throws {
        let contents = try String(contentsOf: url, encoding: .utf8)
        // Each stack entry is (conditionMatchesGuard, parentIsGuarded); the level is
        // guarded if either its own condition matches, or an enclosing level is guarded.
        var stack: [(matches: Bool, parentGuarded: Bool)] = []

        for (index, rawLine) in contents.components(separatedBy: .newlines).enumerated() {
            let line = rawLine.trimmingCharacters(in: .whitespaces)
            let lineNumber = index + 1

            if line.hasPrefix("#if") {
                let parentGuarded = stack.last.map { $0.matches || $0.parentGuarded } ?? false
                stack.append((matches: line.contains(guardPattern), parentGuarded: parentGuarded))
                continue
            }
            if line.hasPrefix("#else") {
                if let top = stack.last {
                    stack[stack.count - 1] = (matches: !top.matches, parentGuarded: top.parentGuarded)
                }
                continue
            }
            if line.hasPrefix("#endif") {
                if !stack.isEmpty {
                    stack.removeLast()
                }
                continue
            }

            let isGuarded = stack.last.map { $0.matches || $0.parentGuarded } ?? false
            if isGuarded {
                continue
            }

            for symbol in Self.iOSOnlySymbols where line.contains(symbol) {
                XCTFail(
                    "\(url.lastPathComponent):\(lineNumber) references iOS-only symbol " +
                        "'\(symbol)' without a '\(guardPattern)' guard. This will break the tvOS " +
                        "build: wrap this reference in the appropriate platform guard.",
                    file: #filePath,
                    line: UInt(lineNumber)
                )
            }
        }
    }

    private func swiftSourceFiles() throws -> [URL] {
        try sourceFiles(withExtension: "swift")
    }

    private func objectiveCSourceFiles() throws -> [URL] {
        try sourceFiles(withExtension: "mm") + sourceFiles(withExtension: "m")
    }

    private func sourceFiles(withExtension fileExtension: String) throws -> [URL] {
        let sourcesDirectory = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("Sources")

        guard let enumerator = FileManager.default.enumerator(
            at: sourcesDirectory,
            includingPropertiesForKeys: nil
        ) else {
            XCTFail("Could not enumerate \(sourcesDirectory.path)")
            return []
        }

        return enumerator.compactMap { $0 as? URL }.filter { $0.pathExtension == fileExtension }
    }
}
