/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation

internal final class NativeFfeConfigurationFetcher {
    private let transport: NativeFfeConfigurationTransport
    private let clockMs: () -> Int64

    init(
        transport: NativeFfeConfigurationTransport = URLSessionNativeFfeConfigurationTransport(),
        clockMs: @escaping () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1_000) }
    ) {
        self.transport = transport
        self.clockMs = clockMs
    }

    func fetch(kind: String, options: [String: Any]) throws -> NativeFfeFetchedConfiguration {
        let fetchOptions = try NativeFfeFetchOptions(kind: kind, options: options)
        let request = try fetchOptions.toRequest()
        let response: NativeFfeHTTPResponse
        do {
            response = try transport.execute(request)
        } catch {
            throw NativeFfeConfigurationFetchError(request: request, cause: error)
        }

        let wire: String
        if response.statusCode == Constants.httpNotModified {
            guard let previousConfigurationWire = fetchOptions.previousConfigurationWire else {
                throw NativeFfeConfigurationFetchError(
                    request: request,
                    cause: NativeFfeConfigurationFetchFailure(
                        "304 response requires previousConfigurationWire"
                    )
                )
            }
            wire = previousConfigurationWire
        } else if Constants.httpSuccessRange.contains(response.statusCode) {
            wire = try buildWire(kind: kind, response: response, options: fetchOptions)
        } else {
            throw NativeFfeConfigurationFetchError(
                request: request,
                cause: NativeFfeConfigurationFetchFailure(
                    "Unexpected native flags fetch status: \(response.statusCode)"
                )
            )
        }

        return NativeFfeFetchedConfiguration(
            wire: wire,
            request: request,
            statusCode: response.statusCode
        )
    }

    private func buildWire(
        kind: String,
        response: NativeFfeHTTPResponse,
        options: NativeFfeFetchOptions
    ) throws -> String {
        var payload: [String: Any] = [
            "response": response.body,
            "fetchedAt": clockMs(),
        ]

        if let etag = response.header("etag"), !etag.isEmpty {
            payload["etag"] = etag
        }
        if kind == NativeFfeConfigurationConstants.kindPrecomputed,
            !options.evaluationContext.isEmpty
        {
            payload["context"] = options.evaluationContext
        }

        return try NativeFfeJSON.encodeObject([
            "version": Constants.supportedWireVersion,
            kind.toWireSection(): payload,
        ])
    }

    private enum Constants {
        static let supportedWireVersion = 2
        static let httpNotModified = 304
        static let httpSuccessRange = 200...299
    }
}

internal struct NativeFfeFetchedConfiguration {
    let wire: String
    let request: NativeFfeHTTPRequest
    let statusCode: Int
}

internal struct NativeFfeHTTPRequest {
    let url: String
    let method: String
    let headers: [String: String]

    func toDebugMap(statusCode: Int? = nil) -> [String: Any] {
        var map: [String: Any] = [
            "url": url,
            "method": method,
            "headers": headers,
        ]
        if let statusCode {
            map["statusCode"] = statusCode
        }
        return map
    }
}

internal struct NativeFfeHTTPResponse {
    let statusCode: Int
    let headers: [String: String]
    let body: String

    func header(_ name: String) -> String? {
        headers.first { key, _ in key.caseInsensitiveCompare(name) == .orderedSame }?.value
    }
}

internal protocol NativeFfeConfigurationTransport {
    func execute(_ request: NativeFfeHTTPRequest) throws -> NativeFfeHTTPResponse
}

internal final class NativeFfeConfigurationFetchError: Error, LocalizedError {
    let request: NativeFfeHTTPRequest
    private let cause: Error

    init(request: NativeFfeHTTPRequest, cause: Error) {
        self.request = request
        self.cause = cause
    }

    var errorDescription: String? {
        (cause as? LocalizedError)?.errorDescription ?? cause.localizedDescription
    }
}

private struct NativeFfeFetchOptions {
    let kind: String
    let endpoint: String
    let clientToken: String?
    let sdkKey: String?
    let site: String?
    let headers: [String: String]
    let flagQueryParams: [String: Any]
    let evaluationContext: [String: Any]
    let previousConfigurationWire: String?

    init(kind: String, options: [String: Any]) throws {
        guard let endpoint = stringValue(options["endpoint"]), !endpoint.isEmpty else {
            throw NativeFfeConfigurationFetchFailure("Flags fetch requires endpoint")
        }
        self.kind = kind
        self.endpoint = endpoint
        self.clientToken = nonEmptyString(options["clientToken"])
        self.sdkKey = nonEmptyString(options["sdkKey"])
        self.site = nonEmptyString(options["site"])
        self.headers = stringMap(options["headers"])
        self.flagQueryParams = anyMap(options["flagQueryParams"])
        self.evaluationContext = anyMap(options["evaluationContext"])
        self.previousConfigurationWire = stringValue(options["previousConfigurationWire"])
    }

    func toRequest() throws -> NativeFfeHTTPRequest {
        var requestHeaders = [
            "Accept": "application/json",
        ]

        if let clientToken {
            requestHeaders["DD-Client-Token"] = clientToken
        }
        if let sdkKey {
            requestHeaders["DD-SDK-Key"] = sdkKey
        }
        if let site {
            requestHeaders["DD-Site"] = site
        }
        if let previousConfigurationWire,
            let etag = try extractEtag(from: previousConfigurationWire, preferredKind: kind)
        {
            requestHeaders["If-None-Match"] = etag
        }
        headers.forEach { key, value in requestHeaders[key] = value }

        return NativeFfeHTTPRequest(
            url: try buildURL(),
            method: NativeFfeConfigurationConstants.httpGet,
            headers: requestHeaders
        )
    }

    private func buildURL() throws -> String {
        guard var components = URLComponents(string: endpoint) else {
            throw NativeFfeConfigurationFetchFailure("Flags fetch endpoint is not a URL")
        }

        var queryItems = components.queryItems ?? []
        queryItems.append(URLQueryItem(name: "kind", value: kind))
        for (key, value) in flagQueryParams where !(value is NSNull) {
            queryItems.append(URLQueryItem(name: key, value: try queryString(value)))
        }
        if kind == NativeFfeConfigurationConstants.kindPrecomputed,
            !evaluationContext.isEmpty
        {
            queryItems.append(
                URLQueryItem(
                    name: "evaluationContext",
                    value: try NativeFfeJSON.encodeObject(evaluationContext)
                )
            )
        }
        components.queryItems = queryItems

        guard let url = components.url?.absoluteString else {
            throw NativeFfeConfigurationFetchFailure("Flags fetch endpoint is not a URL")
        }
        return url
    }

    private func extractEtag(from wire: String, preferredKind: String) throws -> String? {
        guard let data = wire.data(using: .utf8),
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            throw NativeFfeConfigurationFetchFailure("previousConfigurationWire is not valid JSON")
        }

        for section in [
            preferredKind.toWireSection(),
            NativeFfeConfigurationConstants.wireSectionServer,
            NativeFfeConfigurationConstants.kindPrecomputed,
        ] {
            if let payload = json[section] as? [String: Any],
                let etag = nonEmptyString(payload["etag"])
            {
                return etag
            }
        }
        return nil
    }
}

private final class URLSessionNativeFfeConfigurationTransport:
    NativeFfeConfigurationTransport
{
    func execute(_ request: NativeFfeHTTPRequest) throws -> NativeFfeHTTPResponse {
        guard let url = URL(string: request.url) else {
            throw NativeFfeConfigurationFetchFailure("Flags fetch URL is invalid")
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = request.method
        urlRequest.timeoutInterval = Constants.timeoutSeconds
        request.headers.forEach { key, value in
            urlRequest.setValue(value, forHTTPHeaderField: key)
        }

        let semaphore = DispatchSemaphore(value: 0)
        var fetchedData: Data?
        var fetchedResponse: URLResponse?
        var fetchedError: Error?
        URLSession.shared.dataTask(with: urlRequest) { data, response, error in
            fetchedData = data
            fetchedResponse = response
            fetchedError = error
            semaphore.signal()
        }.resume()
        semaphore.wait()

        if let fetchedError {
            throw fetchedError
        }
        guard let httpResponse = fetchedResponse as? HTTPURLResponse else {
            throw NativeFfeConfigurationFetchFailure("Flags fetch response is not HTTP")
        }

        var headers: [String: String] = [:]
        httpResponse.allHeaderFields.forEach { key, value in
            if let key = key as? String {
                headers[key] = String(describing: value)
            }
        }

        return NativeFfeHTTPResponse(
            statusCode: httpResponse.statusCode,
            headers: headers,
            body: fetchedData.flatMap { String(data: $0, encoding: .utf8) } ?? ""
        )
    }

    private enum Constants {
        static let timeoutSeconds: TimeInterval = 5
    }
}

private enum NativeFfeJSON {
    static func encodeObject(_ object: [String: Any]) throws -> String {
        let data = try JSONSerialization.data(withJSONObject: object, options: [])
        guard let encoded = String(data: data, encoding: .utf8) else {
            throw NativeFfeConfigurationFetchFailure("Unable to encode flags configuration JSON")
        }
        return encoded
    }
}

private struct NativeFfeConfigurationFetchFailure: Error, LocalizedError {
    private let message: String

    init(_ message: String) {
        self.message = message
    }

    var errorDescription: String? {
        message
    }
}

private enum NativeFfeConfigurationConstants {
    static let kindRules = "rules"
    static let kindPrecomputed = "precomputed"
    static let wireSectionServer = "server"
    static let httpGet = "GET"
}

private func stringMap(_ value: Any?) -> [String: String] {
    anyMap(value).compactMapValues { stringValue($0) }
}

private func anyMap(_ value: Any?) -> [String: Any] {
    if let dictionary = value as? [String: Any] {
        return dictionary
    }
    if let dictionary = value as? NSDictionary {
        return dictionary as? [String: Any] ?? [:]
    }
    return [:]
}

private func queryString(_ value: Any) throws -> String {
    if let string = value as? String {
        return string
    }
    if let bool = value as? Bool {
        return bool ? "true" : "false"
    }
    if let number = value as? NSNumber {
        return number.stringValue
    }
    if JSONSerialization.isValidJSONObject(value) {
        let data = try JSONSerialization.data(withJSONObject: value, options: [])
        return String(data: data, encoding: .utf8) ?? String(describing: value)
    }
    return String(describing: value)
}

private func stringValue(_ value: Any?) -> String? {
    guard let value, !(value is NSNull) else {
        return nil
    }
    if let string = value as? String {
        return string
    }
    return String(describing: value)
}

private func nonEmptyString(_ value: Any?) -> String? {
    stringValue(value).flatMap { $0.isEmpty ? nil : $0 }
}

private extension String {
    func toWireSection() -> String {
        self == NativeFfeConfigurationConstants.kindRules
            ? NativeFfeConfigurationConstants.wireSectionServer
            : self
    }
}
