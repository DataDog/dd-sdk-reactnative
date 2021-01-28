"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "DdSdkConfiguration", {
  enumerable: true,
  get: function () {
    return _types.DdSdkConfiguration;
  }
});
Object.defineProperty(exports, "ReactNavigationTrackingStrategy", {
  enumerable: true,
  get: function () {
    return _RumReactNavigationTracking.default;
  }
});
exports.DdRum = exports.DdTrace = exports.DdLogs = exports.DdSdk = void 0;

var _reactNative = require("react-native");

var _types = require("./types");

var _RumReactNavigationTracking = _interopRequireDefault(require("./rum/instrumentation/RumReactNavigationTracking"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
const DdSdk = _reactNative.NativeModules.DdSdk;
exports.DdSdk = DdSdk;
const DdLogs = _reactNative.NativeModules.DdLogs;
exports.DdLogs = DdLogs;
const DdTrace = _reactNative.NativeModules.DdTrace;
exports.DdTrace = DdTrace;
const DdRum = _reactNative.NativeModules.DdRum;
exports.DdRum = DdRum;
//# sourceMappingURL=index.js.map