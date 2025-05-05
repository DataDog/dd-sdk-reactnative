// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription
import Foundation

let package = Package(
    name: "DatadogBenchmarks",
    products: [
        .library(
            name: "DatadogBenchmarks",
            targets: ["DatadogBenchmarks"]
        )
    ]
)

func addOpenTelemetryDependency(_ version: Version) {
    package.platforms = [.iOS(.v13), .tvOS(.v13)]

    package.dependencies = [
        .package(url: "https://github.com/open-telemetry/opentelemetry-swift", exact: version)
    ]

    package.targets = [
        .target(
            name: "DatadogBenchmarks",
            dependencies: [
                .product(name: "OpenTelemetryApi", package: "opentelemetry-swift"),
                .product(name: "OpenTelemetrySdk", package: "opentelemetry-swift"),
                .product(name: "DatadogExporter", package: "opentelemetry-swift")
            ],
            swiftSettings: [.define("OTEL_SWIFT")]
        )
    ]
}

addOpenTelemetryDependency("1.13.0")

