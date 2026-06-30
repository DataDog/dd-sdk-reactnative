/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import DatadogCore
import DatadogInternal
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
        let key = nativeFfeStorageKey(for: slot)
        let updatedAtMs = clockMs()
        let data = try nativeFfeStoragePayload(key: key, wire: wire, updatedAtMs: updatedAtMs)
        try data.write(to: fileURL(forKey: key), options: .atomic)
        return NativeFfeStoredConfiguration(key: key, wire: wire, updatedAtMs: updatedAtMs)
    }

    func load(slot: String) throws -> NativeFfeStoredConfiguration? {
        let key = nativeFfeStorageKey(for: slot)
        let url = fileURL(forKey: key)
        guard FileManager.default.fileExists(atPath: url.path) else {
            return nil
        }
        let data = try Data(contentsOf: url)
        return try nativeFfeStoredConfiguration(from: data, expectedKey: key)
    }

    private func fileURL(forKey key: String) -> URL {
        rootDirectory.appendingPathComponent("\(key).json")
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
    }
}

internal final class DatadogDataStoreNativeFfeConfigurationStore: NativeFfeConfigurationStoring {
    private let dataStoreProvider: () -> DataStore?
    private let fallbackStore: NativeFfeConfigurationStoring?
    private let clockMs: () -> Int64
    private let timeout: DispatchTimeInterval

    init(
        dataStoreProvider: @escaping () -> DataStore? = {
            guard Datadog.isInitialized(instanceName: CoreRegistry.defaultInstanceName) else {
                return nil
            }
            return CoreRegistry.default.scope(for: NativeFfeFlagsFeature.self).dataStore
        },
        fallbackStore: NativeFfeConfigurationStoring? = nil,
        clockMs: @escaping () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1_000) },
        timeout: DispatchTimeInterval = .seconds(3)
    ) {
        self.dataStoreProvider = dataStoreProvider
        self.fallbackStore = fallbackStore
        self.clockMs = clockMs
        self.timeout = timeout
    }

    func save(slot: String, wire: String) throws -> NativeFfeStoredConfiguration {
        guard let dataStore = dataStoreProvider() else {
            return try fallbackSave(slot: slot, wire: wire)
        }
        let key = nativeFfeStorageKey(for: slot)
        let updatedAtMs = clockMs()
        let payload = try nativeFfeStoragePayload(key: key, wire: wire, updatedAtMs: updatedAtMs)
        dataStore.setValue(payload, forKey: key, version: Constants.payloadVersion)
        dataStore.flush()
        return NativeFfeStoredConfiguration(key: key, wire: wire, updatedAtMs: updatedAtMs)
    }

    func load(slot: String) throws -> NativeFfeStoredConfiguration? {
        guard let dataStore = dataStoreProvider() else {
            return try fallbackStore?.load(slot: slot)
        }
        let key = nativeFfeStorageKey(for: slot)
        let semaphore = DispatchSemaphore(value: 0)
        var result: Result<NativeFfeStoredConfiguration?, Error>?

        dataStore.value(forKey: key) { valueResult in
            switch valueResult {
            case .value(let data, let version):
                guard version == Constants.payloadVersion else {
                    result = .failure(NativeFfeConfigurationStoreError.invalidPayload)
                    break
                }
                result = Result {
                    try nativeFfeStoredConfiguration(from: data, expectedKey: key)
                }
            case .noValue:
                result = .success(nil)
            case .error(let error):
                result = .failure(error)
            }
            semaphore.signal()
        }

        guard semaphore.wait(timeout: .now() + timeout) == .success else {
            return try fallbackStore?.load(slot: slot)
        }

        switch result {
        case .success(let stored):
            if let stored {
                return stored
            }
            return try fallbackStore?.load(slot: slot)
        case .failure:
            return try fallbackStore?.load(slot: slot)
        case .none:
            return try fallbackStore?.load(slot: slot)
        }
    }

    private func fallbackSave(slot: String, wire: String) throws -> NativeFfeStoredConfiguration {
        guard let fallbackStore else {
            throw NativeFfeConfigurationStoreError.dataStoreUnavailable
        }
        return try fallbackStore.save(slot: slot, wire: wire)
    }
}

private struct NativeFfeFlagsFeature: DatadogFeature {
    static let name = "flags"
    let messageReceiver: FeatureMessageReceiver = NOPFeatureMessageReceiver()
}

private enum Constants {
    static let payloadVersion: DataStoreKeyVersion = 1
    static let defaultSlot = "default"
    static let keyPrefix = "flags-configuration"
    static let maxSlotLength = 80
}

private func nativeFfeStorageKey(for slot: String) -> String {
    let rawSlot = slot.isEmpty ? Constants.defaultSlot : slot
    let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "._-"))
    let sanitized = rawSlot.unicodeScalars.map { scalar in
        allowed.contains(scalar) ? Character(scalar).description : "_"
    }.joined().trimmingCharacters(in: CharacterSet(charactersIn: "_"))
    let normalized = sanitized.isEmpty ? Constants.defaultSlot : sanitized
    return "\(Constants.keyPrefix)-\(String(normalized.prefix(Constants.maxSlotLength)))"
}

private func nativeFfeStoragePayload(key: String, wire: String, updatedAtMs: Int64) throws -> Data {
    let payload: [String: Any] = [
        "version": Int(Constants.payloadVersion),
        "key": key,
        "updatedAtMs": updatedAtMs,
        "wire": wire,
    ]
    return try JSONSerialization.data(withJSONObject: payload)
}

private func nativeFfeStoredConfiguration(
    from data: Data,
    expectedKey: String
) throws -> NativeFfeStoredConfiguration {
    guard
        let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any],
        let version = payload["version"] as? Int,
        version == Int(Constants.payloadVersion),
        let wire = payload["wire"] as? String
    else {
        throw NativeFfeConfigurationStoreError.invalidPayload
    }
    let key = (payload["key"] as? String) ?? expectedKey
    let updatedAtMs =
        (payload["updatedAtMs"] as? Int64)
        ?? (payload["updatedAtMs"] as? NSNumber)?.int64Value
        ?? 0
    return NativeFfeStoredConfiguration(key: key, wire: wire, updatedAtMs: updatedAtMs)
}

private enum NativeFfeConfigurationStoreError: LocalizedError {
    case dataStoreUnavailable
    case invalidPayload

    var errorDescription: String? {
        switch self {
        case .dataStoreUnavailable:
            return "Datadog Flags data store is not available"
        case .invalidPayload:
            return "Stored flags configuration payload is invalid"
        }
    }
}
