/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { DdNativeCoreTestsType } from './nativeModulesTypes';
import { base64 } from './utils/base64';

type Feature = 'rum' | 'tracing' | 'logging' | 'session-replay';

/**
 * Traces
 */
type TracingResult = any[] & {
    hasNTraces: (n: number) => void;
    hasSpanWithName: (name: string) => any;
};

const buildTracingResult = (traces: any[]): TracingResult => {
    return {
        ...traces,
        hasNTraces: (n: number) => {
            if (traces.length !== n) {
                throw new Error(
                    `Expected to receive ${n} traces but received ${traces.length}.`
                );
            }
        },
        hasSpanWithName: (name: string) => {
            let spanFound = null;
            traces.forEach(trace => {
                trace.spans.forEach((span: Record<string, any>) => {
                    if (span.name === name) {
                        spanFound = span;
                    }
                });
            });
            if (!spanFound) {
                throw new Error(`Could not find span with name ${name}.`);
            }
            return spanFound;
        }
    } as TracingResult;
};

/**
 * Logs
 */
type LoggingResult = any[] & {
    hasNLogs: (n: number) => void;
    hasLogWithMessageAndLevel: (params: {
        message: string;
        level: 'debug' | 'info' | 'warn' | 'error';
    }) => any;
};

const buildLoggingResult = (logs: any[]): LoggingResult => {
    return {
        ...logs,
        hasNLogs: (n: number) => {
            if (logs.length !== n) {
                throw new Error(
                    `Expected to receive ${n} logs but received ${logs.length}.`
                );
            }
        },
        hasLogWithMessageAndLevel: ({ message, level }) => {
            let logFound = null;
            logs.forEach(log => {
                if (log.message === message && log.status === level) {
                    logFound = log;
                }
            });
            if (!logFound) {
                throw new Error(`Could not find span with message ${message}.`);
            }
            return logFound;
        }
    } as LoggingResult;
};

/**
 * RUM
 */
type RUMResult = any[] & {
    hasErrorWithMessage: (message: string) => any;
    hasActionOfTypeWithTarget: (params: {
        type: string;
        target: string;
    }) => any;
    hasNativeLongTaskWithinDurationInterval: (durationInterval: {
        min: number;
        max: number;
    }) => any;
    hasJSLongTaskWithinDurationInterval: (durationInterval: {
        min: number;
        max: number;
    }) => any;
    hasResourceWithParams: (params: { key: string }) => any;
    hasViewWithContext: (context: Record<string, string>) => any;
};

const buildRUMResult = (events: any[]): RUMResult => {
    return {
        ...events,
        hasErrorWithMessage: message => {
            const error = events.find(event => {
                if (event.type === 'error') {
                    if (event.error.message === message) {
                        return true;
                    }
                }
                return false;
            });
            if (!error) {
                const errors = events.find(event => event.type === 'error');
                throw new Error(
                    `Could not find error with message ${message}. Errors: \n${JSON.stringify(
                        errors
                    )}`
                );
            }
            return error;
        },
        hasActionOfTypeWithTarget: ({ type, target }) => {
            const action = events.find(event => {
                if (event.type === 'action') {
                    if (
                        event.action.type === type &&
                        event.action.target.name === target
                    ) {
                        return true;
                    }
                }
                return false;
            });
            if (!action) {
                throw new Error(
                    `Could not find action with type ${type} and target name ${target}`
                );
            }
            return action;
        },
        hasNativeLongTaskWithinDurationInterval: ({ min, max }) => {
            const longTask = events.find(event => {
                if (event.type === 'long_task') {
                    if (event.context['long_task.target'] !== 'javascript') {
                        const duration = event.long_task.duration;
                        if (duration > min && duration < max) {
                            return true;
                        }
                    }
                }
                return false;
            });
            if (!longTask) {
                throw new Error(
                    `Could not find long task between ${min} and ${max}`
                );
            }
            return longTask;
        },
        hasJSLongTaskWithinDurationInterval: ({ min, max }) => {
            const longTask = events.find(event => {
                if (event.type === 'long_task') {
                    if (event.context['long_task.target'] === 'javascript') {
                        const duration = event.long_task.duration;
                        if (duration > min && duration < max) {
                            return true;
                        }
                    }
                }
                return false;
            });
            if (!longTask) {
                throw new Error(
                    `Could not find long task between ${min} and ${max}`
                );
            }
            return longTask;
        },
        hasResourceWithParams: ({ key }) => {
            const resource = events.find(event => {
                if (event.type === 'resource') {
                    if (event.resource.key === key) {
                        return true;
                    }
                }
                return false;
            });
            if (!resource) {
                throw new Error(`Could not find resource with key ${key}.`);
            }
            return resource;
        },
        hasViewWithContext: context => {
            const view = events.find(event => {
                if (event.type === 'view') {
                    if (
                        JSON.stringify(event.context) ===
                        JSON.stringify(context)
                    ) {
                        return true;
                    }
                }
                return false;
            });
            if (!view) {
                throw new Error(`Could not find view with key ${context}.`);
            }
            return view;
        }
    } as RUMResult;
};
class DdCoreTestsWrapper {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    nativeDdCoreTests: DdNativeCoreTestsType = require('./specs/NativeDdCoreTests')
        .default;
    clearData = () => {
        return this.nativeDdCoreTests.clearData();
    };
    getAllEventsData = async (feature: Feature) => {
        const events = await this.nativeDdCoreTests.getAllEventsData(feature);
        return (JSON.parse(events) as string[]).map(event =>
            JSON.parse(base64.decode(event))
        );
    };
    getTraces = async (): Promise<TracingResult> => {
        const traces = await this.getAllEventsData('tracing');
        return buildTracingResult(traces);
    };
    getLogs = async (): Promise<LoggingResult> => {
        const logs = await this.getAllEventsData('logging');
        return buildLoggingResult(logs);
    };
    // This should get better getters, like getRUMActions, getRUMErrors, getRUMLongTasks, etc.
    getRumEvents = async (): Promise<RUMResult> => {
        const events = await this.getAllEventsData('rum');
        return buildRUMResult(events);
    };
}

export const DdCoreTests = new DdCoreTestsWrapper();
