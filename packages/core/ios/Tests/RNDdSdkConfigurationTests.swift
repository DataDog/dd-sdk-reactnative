/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-Present Datadog, Inc.
 */

import XCTest
@testable import DatadogSDKReactNative
@testable import DatadogInternal

class RNDdSdkConfigurationTests: XCTestCase {
    override func setUp() {
        super.setUp()
    }

    override func tearDown() {
        super.tearDown()
    }

    func testBuildProxyConfiguration() {
        let configuration: NSMutableDictionary = [
            "address": "host",
            "port": 99,
            "username": "username",
            "password": "pwd"
        ]

        var proxy = configuration.asProxyConfig()

        XCTAssertEqual(proxy?[kCFProxyUsernameKey] as? String, "username")
        XCTAssertEqual(proxy?[kCFProxyPasswordKey] as? String, "pwd")

        configuration.setValue("http", forKey: "type")
        proxy = configuration.asProxyConfig()
        XCTAssertEqual(proxy?["HTTPEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["HTTPProxy"] as? String, "host")
        XCTAssertEqual(proxy?["HTTPPort"] as? Int, 99)
        XCTAssertEqual(proxy?["HTTPSEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["HTTPSProxy"] as? String, "host")
        XCTAssertEqual(proxy?["HTTPSPort"] as? Int, 99)

        configuration.setValue("https", forKey: "type")
        proxy = configuration.asProxyConfig()
        XCTAssertEqual(proxy?["HTTPEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["HTTPProxy"] as? String, "host")
        XCTAssertEqual(proxy?["HTTPPort"] as? Int, 99)
        XCTAssertEqual(proxy?["HTTPSEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["HTTPSProxy"] as? String, "host")
        XCTAssertEqual(proxy?["HTTPSPort"] as? Int, 99)

        configuration.setValue("socks", forKey: "type")
        proxy = configuration.asProxyConfig()
        XCTAssertEqual(proxy?["SOCKSEnable"] as? Int, 1)
        XCTAssertEqual(proxy?["SOCKSProxy"] as? String, "host")
        XCTAssertEqual(proxy?["SOCKSPort"] as? Int, 99)

        configuration.setValue("99", forKey: "port")
        proxy = configuration.asProxyConfig()
        XCTAssertEqual(proxy?["SOCKSPort"] as? NSNumber, 99)
    }

    func testBuildFirstPartyHosts() {
        let firstPartyHosts = [
            ["match": "example.com", "propagatorTypes": ["datadog", "b3"]],
            ["match": "datadog.com",  "propagatorTypes": ["b3multi", "tracecontext"]]
        ] as NSArray

        let expectedFirstPartyHosts: [String: Set<TracingHeaderType>]? = ["example.com": [.datadog, .b3], "datadog.com": [.b3multi, .tracecontext]]

        XCTAssertEqual(firstPartyHosts.asFirstPartyHosts(), expectedFirstPartyHosts)
    }

    func testBuildMalformedFirstPartyHosts() {
        let firstPartyHosts = [
            ["match": "example.com", "propagatorTypes": ["badPropagatorType", "b3"]]
        ] as NSArray

        let expectedFirstPartyHosts: [String: Set<TracingHeaderType>]? = ["example.com": [.b3]]

        XCTAssertEqual(firstPartyHosts.asFirstPartyHosts(), expectedFirstPartyHosts)

    }
    
    func testBuildFirstPartyHostsWithDuplicatedMatchKey() {
        let firstPartyHosts = [
            ["match": "example.com", "propagatorTypes": ["b3"]],
            ["match": "example.com", "propagatorTypes": ["tracecontext"]],
        ] as NSArray
        
        let expectedFirstPartyHosts: [String: Set<TracingHeaderType>]? = ["example.com": [.b3, .tracecontext]]

        XCTAssertEqual(firstPartyHosts.asFirstPartyHosts(), expectedFirstPartyHosts)
    }

}
