/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { PropagatorType } from '../../rum/types';
import {
    FileBasedConfiguration,
    formatPropagatorType
} from '../FileBasedConfiguration';

import configurationAllFields from './__fixtures__/configuration-all-fields.json';
import malformedConfiguration from './__fixtures__/malformed-configuration.json';

describe('FileBasedConfiguration', () => {
    describe('with user-specified configuration', () => {
        it('resolves configuration fields', () => {
            const configuration = new FileBasedConfiguration(
                configurationAllFields
            );

            expect(configuration).toMatchInlineSnapshot(`
                FileBasedConfiguration {
                  "additionalConfiguration": {
                    "another.property": "test",
                    "myProperty": 1,
                  },
                  "attributeEncoders": [],
                  "batchProcessingLevel": "LOW",
                  "batchSize": "SMALL",
                  "clientToken": "fake-client-token",
                  "env": "fake-env",
                  "initializationMode": "SYNC",
                  "logsConfiguration": LogsConfiguration {
                    "bundleLogsWithRum": true,
                    "bundleLogsWithTraces": true,
                    "customEndpoint": "https://example.com/logs",
                    "logEventMapper": null,
                  },
                  "proxyConfiguration": undefined,
                  "rumConfiguration": RumConfiguration {
                    "actionEventMapper": null,
                    "actionNameAttribute": "action-name-attr",
                    "appHangThreshold": 123,
                    "applicationId": "fake-app-id",
                    "customEndpoint": "https://example.com/rum",
                    "errorEventMapper": null,
                    "firstPartyHosts": [
                      {
                        "match": "example.com",
                        "propagatorTypes": [
                          "b3multi",
                          "tracecontext",
                        ],
                      },
                    ],
                    "initialResourceThreshold": 456,
                    "longTaskThresholdMs": 44,
                    "nativeCrashReportEnabled": true,
                    "nativeInteractionTracking": true,
                    "nativeLongTaskThresholdMs": 789,
                    "nativeViewTracking": true,
                    "resourceEventMapper": null,
                    "resourceTraceSampleRate": 33,
                    "sessionSampleRate": 100,
                    "telemetrySampleRate": 20,
                    "trackBackgroundEvents": true,
                    "trackErrors": true,
                    "trackFetchResources": true,
                    "trackFrustrations": true,
                    "trackInteractions": true,
                    "trackMemoryWarnings": false,
                    "trackNonFatalAnrs": true,
                    "trackResources": true,
                    "trackWatchdogTerminations": true,
                    "useAccessibilityLabel": false,
                    "vitalsUpdateFrequency": "NEVER",
                  },
                  "service": "my-custom-service",
                  "site": "US5",
                  "traceConfiguration": TraceConfiguration {
                    "customEndpoint": "https://example.com/trace",
                  },
                  "trackingConsent": "not_granted",
                  "uploadFrequency": "RARE",
                  "verbosity": "warn",
                  "version": "1.2.3",
                  "versionSuffix": "test-suffix",
                }
            `);
        });

        it('prints a warning message when the configuration file cannot be parsed correctly', () => {
            const warnSpy = jest.spyOn(console, 'warn');
            const config = new FileBasedConfiguration({
                configuration: malformedConfiguration
            });

            expect(config).not.toBeUndefined();
            expect(warnSpy).toHaveBeenCalledTimes(2);
            expect(warnSpy).toHaveBeenCalledWith(
                'DATADOG: Warning - Malformed json configuration file - `clientToken`, `env` and `trackingConsent` are mandatory Core SDK properties.'
            );
            expect(warnSpy).toHaveBeenCalledWith(
                'DATADOG: Warning - Malformed RUM File Configuration - `applicationId` is undefined.'
            );
        });

        it('resolves all properties from a given configuration', () => {
            const config = new FileBasedConfiguration({
                configuration: {
                    rumConfiguration: {
                        useAccessibilityLabel: false,
                        trackInteractions: true,
                        trackResources: true,
                        trackErrors: true,
                        applicationId: 'fake-app-id',
                        longTaskThresholdMs: 44,
                        actionNameAttribute: 'action-name-attr',
                        resourceTraceSampleRate: 33,
                        firstPartyHosts: [
                            {
                                match: 'example.com',
                                propagatorTypes: [
                                    'B3MULTI',
                                    'TRACECONTEXT',
                                    'B3',
                                    'DATADOG'
                                ]
                            }
                        ]
                    },
                    env: 'fake-env',
                    clientToken: 'fake-client-token',
                    trackingConsent: 'NOT_GRANTED',
                    site: 'US5',
                    verbosity: 'WARN',
                    traceConfiguration: {}
                }
            });
            expect(config).toMatchInlineSnapshot(`
                FileBasedConfiguration {
                  "additionalConfiguration": {},
                  "attributeEncoders": [],
                  "batchProcessingLevel": "MEDIUM",
                  "batchSize": "MEDIUM",
                  "clientToken": "fake-client-token",
                  "env": "fake-env",
                  "initializationMode": "SYNC",
                  "logsConfiguration": undefined,
                  "proxyConfiguration": undefined,
                  "rumConfiguration": RumConfiguration {
                    "actionEventMapper": null,
                    "actionNameAttribute": "action-name-attr",
                    "appHangThreshold": undefined,
                    "applicationId": "fake-app-id",
                    "customEndpoint": undefined,
                    "errorEventMapper": null,
                    "firstPartyHosts": [
                      {
                        "match": "example.com",
                        "propagatorTypes": [
                          "b3multi",
                          "tracecontext",
                          "b3",
                          "datadog",
                        ],
                      },
                    ],
                    "initialResourceThreshold": undefined,
                    "longTaskThresholdMs": 44,
                    "nativeCrashReportEnabled": false,
                    "nativeInteractionTracking": false,
                    "nativeLongTaskThresholdMs": 200,
                    "nativeViewTracking": false,
                    "resourceEventMapper": null,
                    "resourceTraceSampleRate": 33,
                    "sessionSampleRate": 100,
                    "telemetrySampleRate": 20,
                    "trackBackgroundEvents": false,
                    "trackErrors": true,
                    "trackFetchResources": false,
                    "trackFrustrations": true,
                    "trackInteractions": true,
                    "trackMemoryWarnings": true,
                    "trackNonFatalAnrs": undefined,
                    "trackResources": true,
                    "trackWatchdogTerminations": false,
                    "useAccessibilityLabel": false,
                    "vitalsUpdateFrequency": "AVERAGE",
                  },
                  "service": undefined,
                  "site": "US5",
                  "traceConfiguration": TraceConfiguration {
                    "customEndpoint": undefined,
                  },
                  "trackingConsent": "not_granted",
                  "uploadFrequency": "AVERAGE",
                  "verbosity": "warn",
                  "version": undefined,
                  "versionSuffix": undefined,
                }
            `);
        });

        it('applies default values when parsing minimal configuration', () => {
            const config = new FileBasedConfiguration({
                configuration: {
                    env: 'fake-env',
                    clientToken: 'fake-client-token',
                    rumConfiguration: {
                        applicationId: 'fake-app-id'
                    }
                }
            });
            expect(config).toMatchInlineSnapshot(`
                FileBasedConfiguration {
                  "additionalConfiguration": {},
                  "attributeEncoders": [],
                  "batchProcessingLevel": "MEDIUM",
                  "batchSize": "MEDIUM",
                  "clientToken": "fake-client-token",
                  "env": "fake-env",
                  "initializationMode": "SYNC",
                  "logsConfiguration": undefined,
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
                    "trackFetchResources": false,
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
                  "traceConfiguration": undefined,
                  "trackingConsent": "granted",
                  "uploadFrequency": "AVERAGE",
                  "verbosity": undefined,
                  "version": undefined,
                  "versionSuffix": undefined,
                }
            `);
        });

        it('applies event mappers to configuration when provided', () => {
            const actionEventMapper = () => null;
            const errorEventMapper = () => null;
            const resourceEventMapper = () => null;
            const config = new FileBasedConfiguration({
                configuration: {
                    env: 'fake-env',
                    clientToken: 'fake-client-token',
                    rumConfiguration: {
                        applicationId: 'fake-app-id'
                    }
                },
                actionEventMapper,
                errorEventMapper,
                resourceEventMapper
            });
            expect(config.rumConfiguration?.actionEventMapper).toBe(
                actionEventMapper
            );
            expect(config.rumConfiguration?.errorEventMapper).toBe(
                errorEventMapper
            );
            expect(config.rumConfiguration?.resourceEventMapper).toBe(
                resourceEventMapper
            );
        });

        it('prints a warning message when the configuration file cannot be parsed correctly', () => {
            expect(
                () =>
                    new FileBasedConfiguration({
                        configuration: {
                            applicationId: 'fake-app-id',
                            env: 'fake-env',
                            clientToken: 'fake-client-token'
                        }
                    })
            ).not.toThrow();
        });

        it('prints a warning message when the first party hosts contain unknown propagator types', () => {
            const config = new FileBasedConfiguration({
                configuration: {
                    env: 'fake-env',
                    clientToken: 'fake-client-token',
                    rumConfiguration: {
                        applicationId: 'fake-app-id',
                        firstPartyHosts: [
                            {
                                match: 'example.com',
                                propagatorTypes: ['UNKNOWN']
                            }
                        ]
                    }
                }
            });
            expect(config.rumConfiguration?.firstPartyHosts).toHaveLength(0);
        });
    });

    describe('formatPropagatorType', () => {
        it('formats all propagatorTypes correctly', () => {
            Object.values(PropagatorType).forEach(propagator => {
                expect(formatPropagatorType(propagator)).not.toBeNull();
            });
        });
    });
});
