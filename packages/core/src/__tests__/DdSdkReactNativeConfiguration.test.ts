/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { buildConfigurationFromPartialConfiguration } from '../DdSdkReactNativeConfiguration';
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
                  "additionalConfig": Object {},
                  "applicationId": "fake-app-id",
                  "clientToken": "fake-client-token",
                  "env": "fake-env",
                  "firstPartyHosts": Array [],
                  "nativeCrashReportEnabled": false,
                  "nativeViewTracking": false,
                  "proxyConfig": undefined,
                  "resourceTracingSamplingRate": 20,
                  "serviceName": undefined,
                  "sessionSamplingRate": 100,
                  "site": "US",
                  "trackErrors": false,
                  "trackInteractions": false,
                  "trackResources": false,
                  "trackingConsent": "granted",
                  "verbosity": undefined,
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
                        resourceTracingSamplingRate: 100
                    },
                    {
                        applicationId: 'fake-app-id',
                        clientToken: 'fake-client-token',
                        env: 'fake-env',
                        sessionSamplingRate: 80,
                        site: 'EU',
                        verbosity: SdkVerbosity.DEBUG,
                        nativeViewTracking: true,
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
                        nativeCrashReportEnabled: true
                    }
                )
            ).toMatchInlineSnapshot(`
                DdSdkReactNativeConfiguration {
                  "additionalConfig": Object {
                    "additionalField": "fake-value",
                  },
                  "applicationId": "fake-app-id",
                  "clientToken": "fake-client-token",
                  "env": "fake-env",
                  "firstPartyHosts": Array [
                    "api.com",
                  ],
                  "nativeCrashReportEnabled": true,
                  "nativeViewTracking": true,
                  "proxyConfig": ProxyConfiguration {
                    "address": "api.com",
                    "password": undefined,
                    "port": 443,
                    "type": "https",
                    "username": undefined,
                  },
                  "resourceTracingSamplingRate": 100,
                  "serviceName": "com.test.app",
                  "sessionSamplingRate": 80,
                  "site": "EU",
                  "trackErrors": true,
                  "trackInteractions": true,
                  "trackResources": true,
                  "trackingConsent": "pending",
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
                        serviceName: '',
                        version: '',
                        versionSuffix: '',
                        additionalConfig: {},
                        nativeCrashReportEnabled: false
                    }
                )
            ).toMatchInlineSnapshot(`
                DdSdkReactNativeConfiguration {
                  "additionalConfig": Object {},
                  "applicationId": "",
                  "clientToken": "",
                  "env": "",
                  "firstPartyHosts": Array [],
                  "nativeCrashReportEnabled": false,
                  "nativeViewTracking": false,
                  "proxyConfig": undefined,
                  "resourceTracingSamplingRate": 0,
                  "serviceName": "",
                  "sessionSamplingRate": 0,
                  "site": "",
                  "trackErrors": false,
                  "trackInteractions": false,
                  "trackResources": false,
                  "trackingConsent": "granted",
                  "verbosity": undefined,
                  "version": "",
                  "versionSuffix": "",
                }
            `);
        });
    });
});
