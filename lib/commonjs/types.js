"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DdSdkConfiguration = void 0;

/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * A configuration object to initialize Datadog's features.
 */
class DdSdkConfiguration {
  constructor(clientToken, env, applicationId) {
    this.clientToken = clientToken;
    this.env = env;
    this.applicationId = applicationId;
  }

}
/**
 * The entry point to initialize Datadog's features.
 */


exports.DdSdkConfiguration = DdSdkConfiguration;
//# sourceMappingURL=types.js.map