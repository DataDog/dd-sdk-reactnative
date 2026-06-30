/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation

internal protocol NativeFfeConfigurationStoring {
    func save(slot: String, wire: String) throws -> NativeFfeStoredConfiguration
    func load(slot: String) throws -> NativeFfeStoredConfiguration?
}

internal struct NativeFfeStoredConfiguration {
    let key: String
    let wire: String
    let updatedAtMs: Int64
}

internal final class FileNativeFfeConfigurationStore: NativeFfeConfigurationStoring {
    private let rootDirectory: URL
    private let clockMs: () -> Int64

    init(
        rootDirectory: URL = FileNativeFfeConfigurationStore.defaultRootDirectory(),
        clockMs: @escaping () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1_000) }
    ) {
        self.rootDirectory = rootDirectory
        self.clockMs = clockMs
    }

    func save(slot: String, wire: String) throws -> NativeFfeStoredConfiguration {
        try FileManager.default.createDirectory(
            at: rootDirectory,
            withIntermediateDirectories: true
        )
        let key = storageKey(for: slot)
        let updatedAtMs = clockMs()
        let payload: [String: Any] = [
            "version": Constants.payloadVersion,
            "key": key,
            "updatedAtMs": updatedAtMs,
            "wire": wire,
        ]
        let data = try JSONSerialization.data(withJSONObject: payload)
        try data.write(to: fileURL(forKey: key), options: .atomic)
        return NativeFfeStoredConfiguration(key: key, wire: wire, updatedAtMs: updatedAtMs)
    }

    func load(slot: String) throws -> NativeFfeStoredConfiguration? {
        let key = storageKey(for: slot)
        let url = fileURL(forKey: key)
        guard FileManager.default.fileExists(atPath: url.path) else {
            return nil
        }
        let data = try Data(contentsOf: url)
        guard
            let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any],
            let version = payload["version"] as? Int,
            version == Constants.payloadVersion,
            let wire = payload["wire"] as? String
        else {
            throw NativeFfeConfigurationStoreError.invalidPayload
        }
        let updatedAtMs =
            (payload["updatedAtMs"] as? Int64)
            ?? (payload["updatedAtMs"] as? NSNumber)?.int64Value
            ?? 0
        return NativeFfeStoredConfiguration(key: key, wire: wire, updatedAtMs: updatedAtMs)
    }

    private func fileURL(forKey key: String) -> URL {
        rootDirectory.appendingPathComponent("\(key).json")
    }

    private func storageKey(for slot: String) -> String {
        let rawSlot = slot.isEmpty ? Constants.defaultSlot : slot
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "._-"))
        let sanitized = rawSlot.unicodeScalars.map { scalar in
            allowed.contains(scalar) ? Character(scalar).description : "_"
        }.joined().trimmingCharacters(in: CharacterSet(charactersIn: "_"))
        let normalized = sanitized.isEmpty ? Constants.defaultSlot : sanitized
        return "\(Constants.keyPrefix)-\(String(normalized.prefix(Constants.maxSlotLength)))"
    }

    private static func defaultRootDirectory() -> URL {
        let base = FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first ?? FileManager.default.temporaryDirectory
        return base
            .appendingPathComponent(Constants.rootDirectory)
            .appendingPathComponent(Constants.configurationsDirectory)
    }

    private enum Constants {
        static let rootDirectory = "Datadog/native-ffe"
        static let configurationsDirectory = "configurations"
        static let payloadVersion = 1
        static let defaultSlot = "default"
        static let keyPrefix = "flags-configuration"
        static let maxSlotLength = 80
    }
}

private enum NativeFfeConfigurationStoreError: LocalizedError {
    case invalidPayload

    var errorDescription: String? {
        switch self {
        case .invalidPayload:
            return "Stored flags configuration payload is invalid"
        }
    }
}
