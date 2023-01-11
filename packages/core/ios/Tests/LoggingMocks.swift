/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-Present Datadog, Inc.
 */

@testable import Datadog

// MARK: - Foundation Mocks

protocol AnyMockable {
    static func mockAny() -> Self
}

extension String: AnyMockable {
    static func mockAny() -> String {
        return "abc"
    }
}

extension Bool: AnyMockable {
    static func mockAny() -> Bool {
        return false
    }
}

extension Date: AnyMockable {
    static func mockAny() -> Date {
        return Date(timeIntervalSinceReferenceDate: 1)
    }
}

// MARK: - Log Mocks

extension NetworkConnectionInfo.Reachability {
    static func mockAny() -> NetworkConnectionInfo.Reachability {
        return .maybe
    }
}

extension NetworkConnectionInfo: AnyMockable {
    static func mockAny() -> NetworkConnectionInfo {
        return mockWith()
    }

    static func mockWith(
        reachability: NetworkConnectionInfo.Reachability = .mockAny(),
        availableInterfaces: [NetworkConnectionInfo.Interface] = [.wifi],
        supportsIPv4: Bool = true,
        supportsIPv6: Bool = true,
        isExpensive: Bool = true,
        isConstrained: Bool = true
    ) -> NetworkConnectionInfo {
        return NetworkConnectionInfo(
            reachability: reachability,
            availableInterfaces: availableInterfaces,
            supportsIPv4: supportsIPv4,
            supportsIPv6: supportsIPv6,
            isExpensive: isExpensive,
            isConstrained: isConstrained
        )
    }
}

extension CarrierInfo.RadioAccessTechnology: AnyMockable {
    static func mockAny() -> CarrierInfo.RadioAccessTechnology { .LTE }
}

extension CarrierInfo: AnyMockable {
    static func mockAny() -> CarrierInfo {
        return mockWith()
    }

    static func mockWith(
        carrierName: String? = .mockAny(),
        carrierISOCountryCode: String? = .mockAny(),
        carrierAllowsVOIP: Bool = .mockAny(),
        radioAccessTechnology: CarrierInfo.RadioAccessTechnology = .mockAny()
    ) -> CarrierInfo {
        return CarrierInfo(
            carrierName: carrierName,
            carrierISOCountryCode: carrierISOCountryCode,
            carrierAllowsVOIP: carrierAllowsVOIP,
            radioAccessTechnology: radioAccessTechnology
        )
    }
}

extension LogEvent: AnyMockable {
    static func mockAny() -> LogEvent {
        return mockWith()
    }

    static func mockWith(
        date: Date = .mockAny(),
        status: LogEvent.Status = .mockAny(),
        message: String = .mockAny(),
        error: LogEvent.Error? = nil,
        serviceName: String = .mockAny(),
        environment: String = .mockAny(),
        loggerName: String = .mockAny(),
        loggerVersion: String = .mockAny(),
        threadName: String = .mockAny(),
        applicationVersion: String = .mockAny(),
        dd: LogEvent.Dd = .mockAny(),
        userInfo: UserInfo = .mockAny(),
        networkConnectionInfo: NetworkConnectionInfo = .mockAny(),
        mobileCarrierInfo: CarrierInfo? = .mockAny(),
        attributes: LogEvent.Attributes = .mockAny(),
        tags: [String]? = nil
    ) -> LogEvent {
        return LogEvent(
            date: date,
            status: status,
            message: message,
            error: error,
            serviceName: serviceName,
            environment: environment,
            loggerName: loggerName,
            loggerVersion: loggerVersion,
            threadName: threadName,
            applicationVersion: applicationVersion,
            dd: dd,
            userInfo: userInfo,
            networkConnectionInfo: networkConnectionInfo,
            mobileCarrierInfo: mobileCarrierInfo,
            attributes: attributes,
            tags: tags
        )
    }
}

extension LogEvent.Status: AnyMockable {
    static func mockAny() -> LogEvent.Status {
        return .info
    }
}

extension LogEvent.UserInfo: AnyMockable {
    static func mockAny() -> LogEvent.UserInfo {
        return mockEmpty()
    }

    static func mockEmpty() -> LogEvent.UserInfo {
        return LogEvent.UserInfo(
            id: nil,
            name: nil,
            email: nil,
            extraInfo: [:]
        )
    }
}

extension LogEvent.Dd: AnyMockable {
    static func mockAny() -> LogEvent.Dd {
        return LogEvent.Dd(
            device: .mockAny()
        )
    }
}

extension LogEvent.DeviceInfo: AnyMockable {
    static func mockAny() -> LogEvent.DeviceInfo {
        return LogEvent.DeviceInfo(
            architecture: .mockAny()
        )
    }
}

extension LogEvent.Attributes: AnyMockable {
    static func mockAny() -> LogEvent.Attributes {
        return mockWith()
    }

    static func mockWith(
        userAttributes: [String: Encodable] = [:],
        internalAttributes: [String: Encodable]? = [:]
    ) -> LogEvent.Attributes {
        return LogEvent.Attributes(
            userAttributes: userAttributes,
            internalAttributes: internalAttributes
        )
    }
}
