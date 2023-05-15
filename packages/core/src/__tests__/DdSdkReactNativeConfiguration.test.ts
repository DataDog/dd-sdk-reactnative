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
                        trackErrors: false,
                        trackInteractions: false,
                        trackResources: false
                    },
                    {
                        applicationId: 'fake-app-id',
                        clientToken: 'fake-client-token',
                        env: 'fake-env'
                    }
                )
            ).toMatchInlineSnapshot(`
                DdSdkReactNativeConfiguration {
                  "actionEventMapper": null,
                  "additionalConfig": {},
                  "applicationId": "fake-app-id",
                  "batchSize": "MEDIUM",
                  "clientToken": "fake-client-token",
                  "env": "fake-env",
                  "errorEventMapper": null,
                  "firstPartyHosts": [],
                  "logEventMapper": null,
                  "longTaskThresholdMs": 0,
                  "nativeCrashReportEnabled": false,
                  "nativeInteractionTracking": false,
                  "nativeLongTaskThresholdMs": 200,
                  "nativeViewTracking": false,
                  "proxyConfig": undefined,
                  "resourceEventMapper": null,
                  "resourceTracingSamplingRate": 20,
                  "serviceName": undefined,
                  "sessionSamplingRate": 100,
                  "site": "US1",
                  "telemetrySampleRate": 20,
                  "trackErrors": false,
                  "trackFrustrations": true,
                  "trackInteractions": false,
                  "trackResources": false,
                  "trackingConsent": "granted",
                  "uploadFrequency": "AVERAGE",
                  "verbosity": undefined,
                  "vitalsUpdateFrequency": "AVERAGE",
                }
            `);
        });

        it('builds the SDK configuration when every configuration attibute is set', () => {
            expect(
                buildConfigurationFromPartialConfiguration(
                    {
                        trackErrors: true,
                        trackInteractions: true,
                        trackResources: true,
                        firstPartyHosts: ['api.com'],
                        resourceTracingSamplingRate: 100,
                        logEventMapper: event => event,
                        errorEventMapper: event => event,
                        resourceEventMapper: event => event,
                        actionEventMapper: event => event
                    },
                    {
                        applicationId: 'fake-app-id',
                        clientToken: 'fake-client-token',
                        env: 'fake-env',
                        sessionSamplingRate: 80,
                        site: 'EU',
                        verbosity: SdkVerbosity.DEBUG,
                        nativeViewTracking: true,
                        nativeInteractionTracking: true,
                        proxyConfig: new ProxyConfiguration(
                            ProxyType.HTTPS,
                            'api.com',
                            443
                        ),

                        serviceName: 'com.test.app',
                        version: '1.4.5',
                        versionSuffix: 'codepush-3',
                        additionalConfig: { additionalField: 'fake-value' },
                        trackingConsent: TrackingConsent.PENDING,
                        nativeCrashReportEnabled: true,
                        nativeLongTaskThresholdMs: 345,
                        longTaskThresholdMs: 567,
                        trackFrustrations: true,
                        uploadFrequency: UploadFrequency.FREQUENT,
                        batchSize: BatchSize.LARGE
                    }
                )
            ).toMatchInlineSnapshot(`
                DdSdkReactNativeConfiguration {
                  "actionEventMapper": [Function],
                  "additionalConfig": {
                    "additionalField": "fake-value",
                  },
                  "applicationId": "fake-app-id",
                  "batchSize": "LARGE",
                  "clientToken": "fake-client-token",
                  "env": "fake-env",
                  "errorEventMapper": [Function],
                  "firstPartyHosts": [
                    "api.com",
                  ],
                  "logEventMapper": [Function],
                  "longTaskThresholdMs": 567,
                  "nativeCrashReportEnabled": true,
                  "nativeInteractionTracking": true,
                  "nativeLongTaskThresholdMs": 345,
                  "nativeViewTracking": true,
                  "proxyConfig": ProxyConfiguration {
                    "address": "api.com",
                    "password": undefined,
                    "port": 443,
                    "type": "https",
                    "username": undefined,
                  },
                  "resourceEventMapper": [Function],
                  "resourceTracingSamplingRate": 100,
                  "serviceName": "com.test.app",
                  "sessionSamplingRate": 80,
                  "site": "EU",
                  "telemetrySampleRate": 20,
                  "trackErrors": true,
                  "trackFrustrations": true,
                  "trackInteractions": true,
                  "trackResources": true,
                  "trackingConsent": "pending",
                  "uploadFrequency": "FREQUENT",
                  "verbosity": "debug",
                  "version": "1.4.5",
                  "versionSuffix": "codepush-3",
                  "vitalsUpdateFrequency": "AVERAGE",
                }
            `);
        });

        it('builds the SDK configuration when falsy values are passed', () => {
            expect(
                buildConfigurationFromPartialConfiguration(
                    {
                        trackErrors: false,
                        trackInteractions: false,
                        trackResources: false,
                        resourceTracingSamplingRate: 0
                    },
                    {
                        applicationId: '',
                        clientToken: '',
                        env: '',
                        sessionSamplingRate: 0,
                        site: '',
                        nativeViewTracking: false,
                        nativeInteractionTracking: false,
                        serviceName: '',
                        version: '',
                        versionSuffix: '',
                        additionalConfig: {},
                        nativeCrashReportEnabled: false,
                        nativeLongTaskThresholdMs: false,
                        longTaskThresholdMs: false,
                        trackFrustrations: false
                    }
                )
            ).toMatchInlineSnapshot(`
                DdSdkReactNativeConfiguration {
                  "actionEventMapper": null,
                  "additionalConfig": {},
                  "applicationId": "",
                  "batchSize": "MEDIUM",
                  "clientToken": "",
                  "env": "",
                  "errorEventMapper": null,
                  "firstPartyHosts": [],
                  "logEventMapper": null,
                  "longTaskThresholdMs": false,
                  "nativeCrashReportEnabled": false,
                  "nativeInteractionTracking": false,
                  "nativeLongTaskThresholdMs": false,
                  "nativeViewTracking": false,
                  "proxyConfig": undefined,
                  "resourceEventMapper": null,
                  "resourceTracingSamplingRate": 0,
                  "serviceName": "",
                  "sessionSamplingRate": 0,
                  "site": "",
                  "telemetrySampleRate": 20,
                  "trackErrors": false,
                  "trackFrustrations": false,
                  "trackInteractions": false,
                  "trackResources": false,
                  "trackingConsent": "granted",
                  "uploadFrequency": "AVERAGE",
                  "verbosity": undefined,
                  "version": "",
                  "versionSuffix": "",
                  "vitalsUpdateFrequency": "AVERAGE",
                }
            `);
        });
    });
});
