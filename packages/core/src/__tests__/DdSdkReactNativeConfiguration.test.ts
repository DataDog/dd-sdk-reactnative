/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    BatchSize,
    UploadFrequency,
    buildConfigurationFromPartialConfiguration
} from '../DdSdkReactNativeConfiguration';
import { ProxyConfiguration, ProxyType } from '../ProxyConfiguration';
import { SdkVerbosity } from '../SdkVerbosity';
import { TrackingConsent } from '../TrackingConsent';

describe('DdSdkReactNativeConfiguration', () => {
    describe('buildConfigurationFromPartialConfiguration', () => {
        it('builds the SDK configuration when minimal configuration is passed', () => {
            expect(
                buildConfigurationFromPartialConfiguration(
                    {
                        rumConfiguration: {
                            trackErrors: false,
                            trackInteractions: false,
                            trackResources: false
                        },
                        logsConfiguration: {},
                        traceConfiguration: {}
                    },
                    {
                        clientToken: 'fake-client-token',
                        env: 'fake-env',
                        rumConfiguration: {
                            applicationId: 'fake-app-id'
                        }
                    }
                )
            ).toMatchInlineSnapshot(`
                CoreConfiguration {
                  "additionalConfiguration": {},
                  "attributeEncoders": [],
                  "batchProcessingLevel": "MEDIUM",
                  "batchSize": "MEDIUM",
                  "clientToken": "fake-client-token",
                  "env": "fake-env",
                  "firstPartyHosts": [],
                  "logsConfiguration": LogsConfiguration {
                    "bundleLogsWithRum": true,
                    "bundleLogsWithTraces": true,
                    "logEventMapper": null,
                  },
                  "nativeCrashReportEnabled": false,
                  "nativeLongTaskThresholdMs": 200,
                  "proxyConfiguration": undefined,
                  "rumConfiguration": RumConfiguration {
                    "actionEventMapper": null,
                    "applicationId": "fake-app-id",
                    "errorEventMapper": null,
                    "longTaskThresholdMs": 200,
                    "nativeInteractionTracking": false,
                    "nativeViewTracking": false,
                    "resourceEventMapper": null,
                    "sessionSampleRate": 100,
                    "telemetrySampleRate": 20,
                    "trackBackgroundEvents": false,
                    "trackErrors": false,
                    "trackFrustrations": true,
                    "trackInteractions": false,
                    "trackMemoryWarnings": true,
                    "trackResources": false,
                    "trackWatchdogTerminations": false,
                    "vitalsUpdateFrequency": "AVERAGE",
                  },
                  "service": undefined,
                  "site": "US1",
                  "traceConfiguration": TraceConfiguration {
                    "resourceTraceSampleRate": 100,
                  },
                  "trackingConsent": "granted",
                  "uploadFrequency": "AVERAGE",
                  "useAccessibilityLabel": true,
                  "verbosity": undefined,
                }
            `);
        });

        it('builds the SDK configuration when every configuration attibute is set', () => {
            expect(
                buildConfigurationFromPartialConfiguration(
                    {
                        rumConfiguration: {
                            actionNameAttribute: 'testID',
                            trackErrors: true,
                            trackInteractions: true,
                            trackResources: true,
                            errorEventMapper: event => event,
                            resourceEventMapper: event => event,
                            actionEventMapper: event => event
                        },
                        traceConfiguration: {
                            resourceTraceSampleRate: 80
                        },
                        logsConfiguration: {
                            logEventMapper: event => event
                        },
                        firstPartyHosts: ['api.com'],
                        useAccessibilityLabel: true
                    },
                    {
                        rumConfiguration: {
                            applicationId: 'fake-app-id',
                            sessionSampleRate: 80,
                            nativeViewTracking: true,
                            nativeInteractionTracking: true,
                            longTaskThresholdMs: 567,
                            trackFrustrations: true,
                            trackBackgroundEvents: true,
                            customEndpoint: 'https://rum.example.com/',
                            initialResourceThreshold: 0.123
                        },
                        logsConfiguration: {
                            bundleLogsWithRum: true,
                            bundleLogsWithTraces: true,
                            customEndpoint: 'https://logs.example.com/'
                        },
                        traceConfiguration: {
                            customEndpoint: 'https://trace.example.com/'
                        },
                        clientToken: 'fake-client-token',
                        env: 'fake-env',
                        site: 'EU',
                        verbosity: SdkVerbosity.DEBUG,
                        proxyConfiguration: new ProxyConfiguration(
                            ProxyType.HTTPS,
                            'api.com',
                            443
                        ),
                        service: 'com.test.app',
                        version: '1.4.5',
                        versionSuffix: 'codepush-3',
                        additionalConfiguration: {
                            additionalField: 'fake-value'
                        },
                        trackingConsent: TrackingConsent.PENDING,
                        nativeCrashReportEnabled: true,
                        nativeLongTaskThresholdMs: 345,
                        uploadFrequency: UploadFrequency.FREQUENT,
                        batchSize: BatchSize.LARGE
                    }
                )
            ).toMatchInlineSnapshot(`
                CoreConfiguration {
                  "additionalConfiguration": {
                    "additionalField": "fake-value",
                  },
                  "attributeEncoders": [],
                  "batchProcessingLevel": "MEDIUM",
                  "batchSize": "LARGE",
                  "clientToken": "fake-client-token",
                  "env": "fake-env",
                  "firstPartyHosts": [
                    "api.com",
                  ],
                  "logsConfiguration": LogsConfiguration {
                    "bundleLogsWithRum": true,
                    "bundleLogsWithTraces": true,
                    "customEndpoint": "https://trace.example.com/",
                    "logEventMapper": [Function],
                  },
                  "nativeCrashReportEnabled": true,
                  "nativeLongTaskThresholdMs": 345,
                  "proxyConfiguration": ProxyConfiguration {
                    "address": "api.com",
                    "port": 443,
                    "type": "https",
                  },
                  "rumConfiguration": RumConfiguration {
                    "actionEventMapper": [Function],
                    "actionNameAttribute": "testID",
                    "applicationId": "fake-app-id",
                    "customEndpoint": "https://rum.example.com/",
                    "errorEventMapper": [Function],
                    "initialResourceThreshold": 0.123,
                    "longTaskThresholdMs": 567,
                    "nativeInteractionTracking": true,
                    "nativeViewTracking": true,
                    "resourceEventMapper": [Function],
                    "sessionSampleRate": 80,
                    "telemetrySampleRate": 20,
                    "trackBackgroundEvents": true,
                    "trackErrors": true,
                    "trackFrustrations": true,
                    "trackInteractions": true,
                    "trackMemoryWarnings": true,
                    "trackResources": true,
                    "trackWatchdogTerminations": false,
                    "vitalsUpdateFrequency": "AVERAGE",
                  },
                  "service": "com.test.app",
                  "site": "EU",
                  "traceConfiguration": TraceConfiguration {
                    "customEndpoint": "https://trace.example.com/",
                    "resourceTraceSampleRate": 80,
                  },
                  "trackingConsent": "pending",
                  "uploadFrequency": "FREQUENT",
                  "useAccessibilityLabel": true,
                  "verbosity": "debug",
                  "version": "1.4.5",
                  "versionSuffix": "codepush-3",
                }
            `);
        });

        it('builds the SDK configuration when falsy values are passed', () => {
            expect(
                buildConfigurationFromPartialConfiguration(
                    {
                        rumConfiguration: {
                            trackErrors: false,
                            trackInteractions: false,
                            trackResources: false
                        },
                        traceConfiguration: {
                            resourceTraceSampleRate: 0
                        },
                        logsConfiguration: {},
                        useAccessibilityLabel: false
                    },
                    {
                        rumConfiguration: {
                            applicationId: '',
                            sessionSampleRate: 0,
                            nativeViewTracking: false,
                            nativeInteractionTracking: false,
                            longTaskThresholdMs: false,
                            trackFrustrations: false,
                            trackBackgroundEvents: false
                        },
                        logsConfiguration: {
                            bundleLogsWithRum: false,
                            bundleLogsWithTraces: false
                        },
                        clientToken: '',
                        env: '',
                        site: '',
                        service: '',
                        version: '',
                        versionSuffix: '',
                        additionalConfiguration: {},
                        nativeCrashReportEnabled: false,
                        nativeLongTaskThresholdMs: false
                    }
                )
            ).toMatchInlineSnapshot(`
                CoreConfiguration {
                  "additionalConfiguration": {},
                  "attributeEncoders": [],
                  "batchProcessingLevel": "MEDIUM",
                  "batchSize": "MEDIUM",
                  "clientToken": "",
                  "env": "",
                  "firstPartyHosts": [],
                  "logsConfiguration": LogsConfiguration {
                    "bundleLogsWithRum": true,
                    "bundleLogsWithTraces": true,
                    "logEventMapper": null,
                  },
                  "nativeCrashReportEnabled": false,
                  "nativeLongTaskThresholdMs": 200,
                  "proxyConfiguration": undefined,
                  "rumConfiguration": RumConfiguration {
                    "actionEventMapper": null,
                    "applicationId": "",
                    "errorEventMapper": null,
                    "longTaskThresholdMs": 200,
                    "nativeInteractionTracking": false,
                    "nativeViewTracking": false,
                    "resourceEventMapper": null,
                    "sessionSampleRate": 100,
                    "telemetrySampleRate": 20,
                    "trackBackgroundEvents": false,
                    "trackErrors": false,
                    "trackFrustrations": true,
                    "trackInteractions": false,
                    "trackMemoryWarnings": true,
                    "trackResources": false,
                    "trackWatchdogTerminations": false,
                    "vitalsUpdateFrequency": "AVERAGE",
                  },
                  "service": undefined,
                  "site": "US1",
                  "traceConfiguration": TraceConfiguration {
                    "resourceTraceSampleRate": 0,
                  },
                  "trackingConsent": "granted",
                  "uploadFrequency": "AVERAGE",
                  "useAccessibilityLabel": false,
                  "verbosity": undefined,
                }
            `);
        });
    });
});
