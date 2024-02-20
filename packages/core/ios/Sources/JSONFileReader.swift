/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogInternal

public class JSONFileReader: ResourceFileReader {
    public func parseResourceFile(resourcePath: String) -> Any? {
        if let path = Bundle.main.path(forResource: resourcePath, ofType: "json") {
            do {
                  let data = try Data(contentsOf: URL(fileURLWithPath: path), options: .mappedIfSafe)
                  return try JSONSerialization.jsonObject(with: data, options: .mutableLeaves)
              } catch {
                  consolePrint("Error parsing \(resourcePath).json file: \(error)", .critical)
              }
        } else {
            consolePrint("\(resourcePath).json file has not been added as Xcode resource.", .critical)
        }
        return nil
    }
}

public protocol ResourceFileReader {
    func parseResourceFile(resourcePath: String) -> Any?
}
