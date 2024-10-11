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
        it('resolves all properties from a given file path', () => {
            const config = new FileBasedConfiguration({
                configuration: {
                    configuration: {
                        applicationId: 'fake-app-id',
                        env: 'fake-env',
                        clientToken: 'fake-client-token',
                        trackInteractions: true,
                        trackResources: true,
                        trackErrors: true,
                        trackingConsent: 'NOT_GRANTED',
                        longTaskThresholdMs: 44,
                        verbosity: 'WARN',
                        actionNameAttribute: 'action-name-attr',
                        useAccessibilityLabel: true,
                        resourceTracingSamplingRate: 33,
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
                }
            });
            expect(config).toMatchInlineSnapshot(`
                FileBasedConfiguration {
                  "actionEventMapper": null,
                  "actionNameAttribute": "action-name-attr",
                  "additionalConfiguration": {},
                  "applicationId": "fake-app-id",
                  "batchSize": "MEDIUM",
                  "bundleLogsWithRum": true,
                  "bundleLogsWithTraces": true,
                  "clientToken": "fake-client-token",
                  "customEndpoints": {},
                  "env": "fake-env",
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
                  "initializationMode": "SYNC",
                  "logEventMapper": null,
                  "longTaskThresholdMs": 44,
                  "nativeCrashReportEnabled": false,
                  "nativeInteractionTracking": false,
                  "nativeLongTaskThresholdMs": 200,
                  "nativeViewTracking": false,
                  "proxyConfig": undefined,
                  "resourceEventMapper": null,
                  "resourceTracingSamplingRate": 33,
                  "serviceName": undefined,
                  "sessionSamplingRate": 100,
                  "site": "US1",
                  "telemetrySampleRate": 20,
                  "trackBackgroundEvents": false,
                  "trackErrors": true,
                  "trackFrustrations": true,
                  "trackInteractions": true,
                  "trackResources": true,
                  "trackWatchdogTerminations": false,
                  "trackingConsent": "not_granted",
                  "uploadFrequency": "AVERAGE",
                  "useAccessibilityLabel": true,
                  "verbosity": "warn",
                  "vitalsUpdateFrequency": "AVERAGE",
                }
            `);
        });
        it('applies default values to configuration from a given file path', () => {
            const config = new FileBasedConfiguration({
                configuration: {
                    configuration: {
                        applicationId: 'fake-app-id',
                        env: 'fake-env',
                        clientToken: 'fake-client-token'
                    }
                }
            });
            expect(config).toMatchInlineSnapshot(`
                FileBasedConfiguration {
                  "actionEventMapper": null,
                  "actionNameAttribute": undefined,
                  "additionalConfiguration": {},
                  "applicationId": "fake-app-id",
                  "batchSize": "MEDIUM",
                  "bundleLogsWithRum": true,
                  "bundleLogsWithTraces": true,
                  "clientToken": "fake-client-token",
                  "customEndpoints": {},
                  "env": "fake-env",
                  "errorEventMapper": null,
                  "firstPartyHosts": [],
                  "initializationMode": "SYNC",
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
                  "trackBackgroundEvents": false,
                  "trackErrors": false,
                  "trackFrustrations": true,
                  "trackInteractions": false,
                  "trackResources": false,
                  "trackWatchdogTerminations": false,
                  "trackingConsent": "granted",
                  "uploadFrequency": "AVERAGE",
                  "useAccessibilityLabel": true,
                  "verbosity": undefined,
                  "vitalsUpdateFrequency": "AVERAGE",
                }
            `);
        });
        it('applies event mappers to configuration when provided', () => {
            const actionEventMapper = () => null;
            const errorEventMapper = () => null;
            const resourceEventMapper = () => null;
            const config = new FileBasedConfiguration({
                configuration: {
                    configuration: {
                        applicationId: 'fake-app-id',
                        env: 'fake-env',
                        clientToken: 'fake-client-token'
                    }
                },
                actionEventMapper,
                errorEventMapper,
                resourceEventMapper
            });
            expect(config.actionEventMapper).toBe(actionEventMapper);
            expect(config.errorEventMapper).toBe(errorEventMapper);
            expect(config.resourceEventMapper).toBe(resourceEventMapper);
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
                }
            });
            expect(config.firstPartyHosts).toHaveLength(0);
        });
    });
    describe('with resolved file configuration', () => {
        it('resolves configuration fields', () => {
            const configuration = getJSONConfiguration(configurationAllFields);

            expect(configuration).toMatchInlineSnapshot(`
                {
                  "actionNameAttribute": "action-name-attr",
                  "applicationId": "fake-app-id",
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
                  "longTaskThresholdMs": 44,
                  "resourceTracingSamplingRate": 33,
                  "trackErrors": true,
                  "trackInteractions": true,
                  "trackResources": true,
                  "trackingConsent": "not_granted",
                  "verbosity": "warn",
                }
            `);
        });
        it('prints a warning message when the configuration file is not found', () => {
            expect(() => getJSONConfiguration(undefined)).not.toThrow();
        });
        it('prints a warning message when the configuration file cannot be parsed correctly', () => {
            expect(() =>
                getJSONConfiguration(malformedConfiguration)
            ).not.toThrow();
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
