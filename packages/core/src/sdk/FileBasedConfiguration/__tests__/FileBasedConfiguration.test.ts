/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { PropagatorType } from '../../../rum/types';
import {
    FileBasedConfiguration,
    formatPropagatorType,
    getJSONConfiguration
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
                  "additionalConfiguration": {},
                  "attributeEncoders": [],
                  "batchProcessingLevel": "MEDIUM",
                  "batchSize": "MEDIUM",
                  "clientToken": "fake-client-token",
                  "env": "fake-env",
                  "firstPartyHosts": [
                    {
                      "match": "example.com",
                      "propagatorTypes": [
                        "b3multi",
                        "tracecontext",
                      ],
                    },
                  ],
                  "initializationMode": "SYNC",
                  "logsConfiguration": LogsConfiguration {
                    "bundleLogsWithRum": true,
                    "bundleLogsWithTraces": true,
                    "logEventMapper": null,
                  },
                  "proxyConfiguration": undefined,
                  "rumConfiguration": RumConfiguration {
                    "actionEventMapper": null,
                    "actionNameAttribute": "action-name-attr",
                    "applicationId": "fake-app-id",
                    "errorEventMapper": null,
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
                    "trackFrustrations": true,
                    "trackInteractions": true,
                    "trackMemoryWarnings": true,
                    "trackResources": true,
                    "trackWatchdogTerminations": false,
                    "useAccessibilityLabel": false,
                    "vitalsUpdateFrequency": "AVERAGE",
                  },
                  "service": undefined,
                  "site": "US5",
                  "traceConfiguration": TraceConfiguration {},
                  "trackingConsent": "not_granted",
                  "uploadFrequency": "AVERAGE",
                  "verbosity": "warn",
                }
            `);
        });

        it('prints a warning message when the configuration file cannot be parsed correctly', () => {
            const warnSpy = jest.spyOn(console, 'warn');
            getJSONConfiguration(malformedConfiguration);

            expect(warnSpy).toHaveBeenCalledWith(
                'DATADOG: Warning: Malformed json configuration file - clientToken and env are mandatory Core SDK properties. ApplicationId is mandatory to enable RUM.'
            );
        });

        it('resolves all properties from a given file path', () => {
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
                        resourceTraceSampleRate: 33
                    },
                    env: 'fake-env',
                    clientToken: 'fake-client-token',
                    trackingConsent: 'NOT_GRANTED',
                    site: 'US5',
                    verbosity: 'WARN',
                    traceConfiguration: {},
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
                  "initializationMode": "SYNC",
                  "logsConfiguration": undefined,
                  "proxyConfiguration": undefined,
                  "rumConfiguration": RumConfiguration {
                    "actionEventMapper": null,
                    "actionNameAttribute": "action-name-attr",
                    "applicationId": "fake-app-id",
                    "errorEventMapper": null,
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
                    "trackFrustrations": true,
                    "trackInteractions": true,
                    "trackMemoryWarnings": true,
                    "trackResources": true,
                    "trackWatchdogTerminations": false,
                    "useAccessibilityLabel": false,
                    "vitalsUpdateFrequency": "AVERAGE",
                  },
                  "service": undefined,
                  "site": "US5",
                  "traceConfiguration": TraceConfiguration {},
                  "trackingConsent": "not_granted",
                  "uploadFrequency": "AVERAGE",
                  "verbosity": "warn",
                }
            `);
        });
        it('applies default values to configuration from a given file path', () => {
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
                  "firstPartyHosts": [],
                  "initializationMode": "SYNC",
                  "logsConfiguration": undefined,
                  "proxyConfiguration": undefined,
                  "rumConfiguration": RumConfiguration {
                    "actionEventMapper": null,
                    "applicationId": "fake-app-id",
                    "errorEventMapper": null,
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
                    applicationId: 'fake-app-id',
                    env: 'fake-env',
                    clientToken: 'fake-client-token',
                    firstPartyHosts: [
                        {
                            match: 'example.com',
                            propagatorTypes: ['UNKNOWN']
                        }
                    ]
                }
            });
            expect(config.firstPartyHosts).toHaveLength(0);
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
