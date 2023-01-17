/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-Present Datadog, Inc.
 */

@testable import Datadog

// MARK: - Foundation Mocks
protocol RandomMockable {
    static func mockRandom() -> Self
}

extension String: RandomMockable {
    static func mockRandom() -> String {
        return mockRandom(length: 10)
    }

    static func mockRandom(length: Int) -> String {
        return mockRandom(among: .alphanumericsAndWhitespace, length: length)
    }

    static func mockRandom(among characters: RandomStringCharacterSet, length: Int = 10) -> String {
        return characters.random(ofLength: length)
    }

    static func mockRepeating(character: Character, times: Int) -> String {
        let characters = (0..<times).map { _ in character }
        return String(characters)
    }

    enum RandomStringCharacterSet {
        private static let alphanumericCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        private static let decimalDigitCharacters = "0123456789"

        /// Only letters and numbers (lower and upper cased).
        case alphanumerics
        /// Letters, numbers and whitespace (lower and upper cased).
        case alphanumericsAndWhitespace
        /// Only numbers.
        case decimalDigits
        /// Custom characters.
        case custom(characters: String)

        func random(ofLength length: Int) -> String {
            var characters: String
            switch self {
            case .alphanumerics:
                characters = RandomStringCharacterSet.alphanumericCharacters
            case .alphanumericsAndWhitespace:
                characters = RandomStringCharacterSet.alphanumericCharacters + " "
            case .decimalDigits:
                characters = RandomStringCharacterSet.decimalDigitCharacters
            case .custom(let customCharacters):
                characters = customCharacters
            }

            return String((0..<length).map { _ in characters.randomElement()! })
        }
    }
}

extension Bool: RandomMockable {
    static func mockRandom() -> Bool { .random() }
}

extension Double: RandomMockable {
    static func mockRandom() -> Double {
        return .random(in: -Double(Int.min)...Double(Int.max))
    }
}

extension FixedWidthInteger where Self: RandomMockable {
    static func mockRandom() -> Self {
        return .random(in: min...max)
    }

    static func mockRandom(min: Self = .min, max: Self = .max, otherThan values: Set<Self> = []) -> Self {
        var random: Self = .random(in: min...max)
        while values.contains(random) { random = .random(in: min...max) }
        return random
    }
}

extension UInt64: RandomMockable {}
extension Int64: RandomMockable {}
extension Int: RandomMockable {}

extension Optional: RandomMockable where Wrapped: RandomMockable {
    static func mockRandom() -> Self {
        return .some(.mockRandom())
    }
}

extension Date: RandomMockable {
    static func mockRandom() -> Date {
        let randomTimeInterval = TimeInterval.random(in: 0..<Date().timeIntervalSince1970)
        return Date(timeIntervalSince1970: randomTimeInterval)
    }
}

extension URL: RandomMockable {
    static func mockRandom() -> URL {
        return URL(string: "https://www.foo.com/")!
            .appendingPathComponent(
                .mockRandom(
                    length: 32
                )
            )
    }
}

extension Array: RandomMockable where Element: RandomMockable {
    static func mockRandom() -> [Element] {
        return mockRandom(count: .random(in: 0..<100))
    }

    static func mockRandom(count: Int) -> [Element] {
        return (0..<count).map { _ in .mockRandom() }
    }
}

extension Array {
    func randomElements() -> [Element] {
        return compactMap { Bool.random() ? $0 : nil }
    }
}

extension Dictionary: RandomMockable where Key: RandomMockable, Value: RandomMockable {
    static func mockRandom() -> Dictionary {
        return [Key.mockRandom(): Value.mockRandom()]
    }
}

/// Creates randomized `[String: Codable]` attributes
func mockRandomAttributes() -> [String: Codable] {
    struct Foo: Codable {
        var bar: String = .mockRandom()
        var bizz = Bizz()

        struct Bizz: Codable {
            var buzz: String = .mockRandom()
        }
    }

    // Produces a `.none` value for optional of a random type.
    let randomAbsentOptional: () -> Codable = [
        // swiftlint:disable opening_brace syntactic_sugar
        { Optional<String>.none },
        { Optional<Int>.none },
        { Optional<UInt64>.none },
        { Optional<Double>.none },
        { Optional<Bool>.none },
        { Optional<[Int]>.none },
        { Optional<[String: Int]>.none },
        { Optional<URL>.none },
        { Optional<Foo>.none },
        // swiftlint:enable opening_brace syntactic_sugar
    ].randomElement()!

    return [
        "string-attribute": String.mockRandom(),
        "int-attribute": Int.mockRandom(),
        "uint64-attribute": UInt64.mockRandom(),
        "double-attribute": Double.mockRandom(),
        "bool-attribute": Bool.random(),
        "int-array-attribute": [Int].mockRandom(),
        "dictionary-attribute": [String: Int].mockRandom(),
        "url-attribute": URL.mockRandom(),
        "encodable-struct-attribute": Foo(),
        "absent-attribute": randomAbsentOptional() // when JSON-encoding: `"absent-attribute": null`
    ]
}


// MARK: - RUM Mocks

extension RUMUser {
    static func mockRandom() -> RUMUser {
        return RUMUser(
            email: .mockRandom(),
            id: .mockRandom(),
            name: .mockRandom(),
            usrInfo: mockRandomAttributes()
        )
    }
}

extension RUMConnectivity {
    static func mockRandom() -> RUMConnectivity {
        return RUMConnectivity(
            cellular: .init(
                carrierName: .mockRandom(),
                technology: .mockRandom()
            ),
            interfaces: [.bluetooth, .cellular].randomElements(),
            status: [.connected, .maybe, .notConnected].randomElement()!
        )
    }
}

extension RUMActionID: RandomMockable {
    static func mockRandom() -> RUMActionID {
        if Bool.random() {
            return .string(value: .mockRandom())
        } else {
            return .stringsArray(value: .mockRandom())
        }
    }
}

extension RUMDevice.RUMDeviceType: RandomMockable {
    static func mockRandom() -> RUMDevice.RUMDeviceType {
        return [.mobile, .desktop, .tablet, .tv, .gamingConsole, .bot, .other].randomElement()!
    }
}

extension RUMDevice: RandomMockable {
    static func mockRandom() -> RUMDevice {
        return .init(
            architecture: .mockRandom(),
            brand: .mockRandom(),
            model: .mockRandom(),
            name: .mockRandom(),
            type: .mockRandom()
        )
    }
}

extension RUMOperatingSystem: RandomMockable {
    static func mockRandom() -> RUMOperatingSystem {
        return .init(
            name: .mockRandom(length: 5),
            version: .mockRandom(among: .decimalDigits, length: 2),
            versionMajor: .mockRandom(among: .decimalDigits, length: 1)
        )
    }
}


extension RUMMethod: RandomMockable {
    static func mockRandom() -> RUMMethod {
        return [.post, .get, .head, .put, .delete, .patch].randomElement()!
    }
}

extension RUMEventAttributes: RandomMockable {
    static func mockRandom() -> RUMEventAttributes {
        return .init(contextInfo: mockRandomAttributes())
    }
}


extension RUMResourceEvent: RandomMockable {
    static func mockRandomDropped() -> RUMResourceEvent {
        return RUMResourceEvent(
            dd: .init(
                browserSdkVersion: nil,
                discarded: nil,
                rulePsr: nil,
                session: .init(plan: .plan1),
                spanId: .mockRandom(),
                traceId: .mockRandom()
            ),
            action: .init(id: .mockRandom()),
            application: .init(id: .mockRandom()),
            ciTest: nil,
            connectivity: .mockRandom(),
            context: .init(contextInfo: ["_dd.resource.drop_resource": true] ),
            date: .mockRandom(),
            device: .mockRandom(),
            display: nil,
            os: .mockRandom(),
            resource: .init(
                connect: .init(duration: .mockRandom(), start: .mockRandom()),
                dns: .init(duration: .mockRandom(), start: .mockRandom()),
                download: .init(duration: .mockRandom(), start: .mockRandom()),
                duration: .mockRandom(),
                firstByte: .init(duration: .mockRandom(), start: .mockRandom()),
                id: .mockRandom(),
                method: .mockRandom(),
                provider: .init(
                    domain: .mockRandom(),
                    name: .mockRandom(),
                    type: Bool.random() ? .firstParty : nil
                ),
                redirect: .init(duration: .mockRandom(), start: .mockRandom()),
                size: .mockRandom(),
                ssl: .init(duration: .mockRandom(), start: .mockRandom()),
                statusCode: .mockRandom(),
                type: [.native, .image].randomElement()!,
                url: .mockRandom()
            ),
            service: .mockRandom(),
            session: .init(
                hasReplay: nil,
                id: .mockRandom(),
                type: .user
            ),
            source: .ios,
            synthetics: nil,
            usr: .mockRandom(),
            version: .mockRandom(),
            view: .init(
                id: .mockRandom(),
                referrer: .mockRandom(),
                url: .mockRandom()
            )
        )
    }

    static func mockRandom() -> RUMResourceEvent {
        return RUMResourceEvent(
            dd: .init(
                browserSdkVersion: nil,
                discarded: nil,
                rulePsr: nil,
                session: .init(plan: .plan1),
                spanId: .mockRandom(),
                traceId: .mockRandom()
            ),
            action: .init(id: .mockRandom()),
            application: .init(id: .mockRandom()),
            ciTest: nil,
            connectivity: .mockRandom(),
            context: .mockRandom(),
            date: .mockRandom(),
            device: .mockRandom(),
            display: nil,
            os: .mockRandom(),
            resource: .init(
                connect: .init(duration: .mockRandom(), start: .mockRandom()),
                dns: .init(duration: .mockRandom(), start: .mockRandom()),
                download: .init(duration: .mockRandom(), start: .mockRandom()),
                duration: .mockRandom(),
                firstByte: .init(duration: .mockRandom(), start: .mockRandom()),
                id: .mockRandom(),
                method: .mockRandom(),
                provider: .init(
                    domain: .mockRandom(),
                    name: .mockRandom(),
                    type: Bool.random() ? .firstParty : nil
                ),
                redirect: .init(duration: .mockRandom(), start: .mockRandom()),
                size: .mockRandom(),
                ssl: .init(duration: .mockRandom(), start: .mockRandom()),
                statusCode: .mockRandom(),
                type: [.native, .image].randomElement()!,
                url: .mockRandom()
            ),
            service: .mockRandom(),
            session: .init(
                hasReplay: nil,
                id: .mockRandom(),
                type: .user
            ),
            source: .ios,
            synthetics: nil,
            usr: .mockRandom(),
            version: .mockRandom(),
            view: .init(
                id: .mockRandom(),
                referrer: .mockRandom(),
                url: .mockRandom()
            )
        )
    }
}
