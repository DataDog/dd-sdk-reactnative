/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { buildConfigurationFromPartialConfiguration } from '../config/async/asyncInitializationHelper';
import {
    BatchSize,
    ProxyConfiguration,
    ProxyType,
    SdkVerbosity,
    TrackingConsent,
    UploadFrequency
} from '../config/types';
import { PropagatorType } from '../rum/types';

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
                        logsConfiguration: {}
                    },
                    {
                        clientToken: 'fake-client-token',
                        env: 'fake-env',
                        rumConfiguration: {
                            applicationId: 'fake-app-id'
                        },
                        logsConfiguration: {},
                        traceConfiguration: {}
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
                  "logsConfiguration": LogsConfiguration {
                    "bundleLogsWithRum": true,
                    "bundleLogsWithTraces": true,
                    "customEndpoint": undefined,
                    "logEventMapper": null,
                  },
                  "proxyConfiguration": undefined,
                  "rumConfiguration": RumConfiguration {
                    "actionEventMapper": null,
                    "actionNameAttribute": undefined,
                    "appHangThreshold": undefined,
                    "applicationId": "fake-app-id",
                    "customEndpoint": undefined,
                    "errorEventMapper": null,
                    "firstPartyHosts": [],
                    "initialResourceThreshold": undefined,
                    "longTaskThresholdMs": 0,
                    "nativeCrashReportEnabled": false,
                    "nativeInteractionTracking": false,
                    "nativeLongTaskThresholdMs": 200,
                    "nativeViewTracking": false,
                    "resourceEventMapper": null,
                    "resourceTraceSampleRate": 100,
                    "sessionSampleRate": 100,
                    "telemetrySampleRate": 20,
                    "trackBackgroundEvents": false,
                    "trackErrors": false,
                    "trackFrustrations": true,
                    "trackInteractions": false,
                    "trackMemoryWarnings": true,
                    "trackNonFatalAnrs": undefined,
                    "trackResources": false,
                    "trackWatchdogTerminations": false,
                    "useAccessibilityLabel": true,
                    "vitalsUpdateFrequency": "AVERAGE",
                  },
                  "service": undefined,
                  "site": "US1",
                  "traceConfiguration": TraceConfiguration {
                    "customEndpoint": undefined,
                  },
                  "trackingConsent": "granted",
                  "uploadFrequency": "AVERAGE",
                  "verbosity": undefined,
                  "version": undefined,
                  "versionSuffix": undefined,
                }
            `);
        });

        it('builds the SDK configuration when every configuration attibute is set', () => {
            expect(
                buildConfigurationFromPartialConfiguration(
                    {
                        rumConfiguration: {
                            actionNameAttribute: 'testID',
                            useAccessibilityLabel: true,
                            trackErrors: true,
                            trackInteractions: true,
                            trackResources: true,
                            resourceTraceSampleRate: 80,
                            firstPartyHosts: [
                                {
                                    match: 'api.com',
                                    propagatorTypes: [
                                        PropagatorType.DATADOG,
                                        PropagatorType.TRACECONTEXT
                                    ]
                                }
                            ],

                            errorEventMapper: event => event,
                            resourceEventMapper: event => event,
                            actionEventMapper: event => event
                        },
                        logsConfiguration: {
                            logEventMapper: event => event
                        }
                    },
                    {
                        rumConfiguration: {
                            applicationId: 'fake-app-id',
                            sessionSampleRate: 80,
                            nativeCrashReportEnabled: true,
                            nativeLongTaskThresholdMs: 345,
                            nativeViewTracking: true,
                            nativeInteractionTracking: true,
                            longTaskThresholdMs: 567,
                            trackFrustrations: true,
                            trackNonFatalAnrs: true,
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
                  "logsConfiguration": LogsConfiguration {
                    "bundleLogsWithRum": true,
                    "bundleLogsWithTraces": true,
                    "customEndpoint": "https://logs.example.com/",
                    "logEventMapper": [Function],
                  },
                  "proxyConfiguration": ProxyConfiguration {
                    "address": "api.com",
                    "port": 443,
                    "type": "https",
                  },
                  "rumConfiguration": RumConfiguration {
                    "actionEventMapper": [Function],
                    "actionNameAttribute": "testID",
                    "appHangThreshold": undefined,
                    "applicationId": "fake-app-id",
                    "customEndpoint": "https://rum.example.com/",
                    "errorEventMapper": [Function],
                    "firstPartyHosts": [
                      {
                        "match": "api.com",
                        "propagatorTypes": [
                          "datadog",
                          "tracecontext",
                        ],
                      },
                    ],
                    "initialResourceThreshold": 0.123,
                    "longTaskThresholdMs": 567,
                    "nativeCrashReportEnabled": true,
                    "nativeInteractionTracking": true,
                    "nativeLongTaskThresholdMs": 345,
                    "nativeViewTracking": true,
                    "resourceEventMapper": [Function],
                    "resourceTraceSampleRate": 80,
                    "sessionSampleRate": 80,
                    "telemetrySampleRate": 20,
                    "trackBackgroundEvents": true,
                    "trackErrors": true,
                    "trackFrustrations": true,
                    "trackInteractions": true,
                    "trackMemoryWarnings": true,
                    "trackNonFatalAnrs": true,
                    "trackResources": true,
                    "trackWatchdogTerminations": false,
                    "useAccessibilityLabel": true,
                    "vitalsUpdateFrequency": "AVERAGE",
                  },
                  "service": "com.test.app",
                  "site": "EU",
                  "traceConfiguration": TraceConfiguration {
                    "customEndpoint": "https://trace.example.com/",
                  },
                  "trackingConsent": "pending",
                  "uploadFrequency": "FREQUENT",
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
                            useAccessibilityLabel: false,
                            trackErrors: false,
                            trackInteractions: false,
                            trackResources: false,
                            resourceTraceSampleRate: 0,
                            nativeCrashReportEnabled: false,
                            nativeLongTaskThresholdMs: 0,
                            actionNameAttribute: ''
                        },
                        logsConfiguration: {}
                    },
                    {
                        rumConfiguration: {
                            applicationId: '',
                            sessionSampleRate: 0,
                            nativeViewTracking: false,
                            nativeInteractionTracking: false,
                            longTaskThresholdMs: false,
                            trackFrustrations: false,
                            trackBackgroundEvents: false,
                            trackMemoryWarnings: false,
                            trackNonFatalAnrs: false,
                            telemetrySampleRate: 0,
                            appHangThreshold: 0,
                            initialResourceThreshold: 0
                        },
                        logsConfiguration: {
                            bundleLogsWithRum: false,
                            bundleLogsWithTraces: false
                        },
                        traceConfiguration: {},
                        clientToken: '',
                        env: '',
                        site: '',
                        service: '',
                        version: '',
                        versionSuffix: '',
                        additionalConfiguration: {}
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
                  "logsConfiguration": LogsConfiguration {
                    "bundleLogsWithRum": false,
                    "bundleLogsWithTraces": false,
                    "customEndpoint": undefined,
                    "logEventMapper": null,
                  },
                  "proxyConfiguration": undefined,
                  "rumConfiguration": RumConfiguration {
                    "actionEventMapper": null,
                    "actionNameAttribute": "",
                    "appHangThreshold": 0,
                    "applicationId": "",
                    "customEndpoint": undefined,
                    "errorEventMapper": null,
                    "firstPartyHosts": [],
                    "initialResourceThreshold": 0,
                    "longTaskThresholdMs": false,
                    "nativeCrashReportEnabled": false,
                    "nativeInteractionTracking": false,
                    "nativeLongTaskThresholdMs": 0,
                    "nativeViewTracking": false,
                    "resourceEventMapper": null,
                    "resourceTraceSampleRate": 0,
                    "sessionSampleRate": 0,
                    "telemetrySampleRate": 0,
                    "trackBackgroundEvents": false,
                    "trackErrors": false,
                    "trackFrustrations": false,
                    "trackInteractions": false,
                    "trackMemoryWarnings": false,
                    "trackNonFatalAnrs": false,
                    "trackResources": false,
                    "trackWatchdogTerminations": false,
                    "useAccessibilityLabel": false,
                    "vitalsUpdateFrequency": "AVERAGE",
                  },
                  "service": "",
                  "site": "",
                  "traceConfiguration": TraceConfiguration {
                    "customEndpoint": undefined,
                  },
                  "trackingConsent": "granted",
                  "uploadFrequency": "AVERAGE",
                  "verbosity": undefined,
                  "version": "",
                  "versionSuffix": "",
                }
            `);
        });
    });
});
