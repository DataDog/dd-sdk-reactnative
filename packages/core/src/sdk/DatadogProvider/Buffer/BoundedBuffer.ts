/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../InternalLog';
import { SdkVerbosity } from '../../../SdkVerbosity';
import { DdSdk } from '../../../sdk/DdSdk';
import { getErrorStackTrace } from '../../../utils/errorUtils';

import { DatadogBuffer } from './DatadogBuffer';

const DEFAULT_BUFFER_SIZE = 100;

type VoidCallback = {
    callback: () => Promise<void>;
    _type: 'VOID';
};

type CallbackReturningId = {
    callback: () => Promise<string>;
    returnedBufferId: string;
    _type: 'RETURNING_ID';
};

type CallbackWithId = {
    callback: (id: string) => Promise<void>;
    withBufferId: string;
    _type: 'WITH_ID';
};

type BufferItem = VoidCallback | CallbackReturningId | CallbackWithId;

export class BoundedBuffer extends DatadogBuffer {
    private bufferSize: number;
    private buffer: BufferItem[] = [];
    private idTable: { [bufferId: string]: string | null } = {};
    private telemetryBuffer: {
        [kind: string]: {
            message: string;
            stack: string;
            kind: string;
            occurrences: number;
        };
    } = {};

    constructor(bufferSize: number = DEFAULT_BUFFER_SIZE) {
        super();
        this.bufferSize = bufferSize;
    }

    addCallback = (callback: () => Promise<void>) => {
        if (this.buffer.length < this.bufferSize) {
            this.buffer.push({ callback, _type: 'VOID' });
        } else {
            this.logBufferOverflow();
        }

        return new Promise<void>(resolve => resolve(undefined));
    };

    addCallbackReturningId = (callback: () => Promise<string>) => {
        try {
            const bufferId = this.generateRandomBufferId();
            if (this.buffer.length < this.bufferSize) {
                this.buffer.push({
                    callback,
                    returnedBufferId: bufferId,
                    _type: 'RETURNING_ID'
                });
                this.idTable[bufferId] = null;
            } else {
                this.logBufferOverflow();
            }

            return new Promise<string>(resolve => resolve(bufferId));
        } catch (error: any) {
            this.logRandomIdGenerationError(error);
            return new Promise<string>(resolve => resolve(''));
        }
    };

    addCallbackWithId = (
        callback: (id: string) => Promise<void>,
        bufferId: string
    ) => {
        if (this.idTable[bufferId] !== undefined) {
            this.buffer.push({
                callback,
                withBufferId: bufferId,
                _type: 'WITH_ID'
            });
        } else {
            this.logBufferOverflow();
        }

        return new Promise<void>(resolve => resolve(undefined));
    };

    drain = async () => {
        for (
            let bufferIndex = 0;
            bufferIndex < this.buffer.length;
            bufferIndex++
        ) {
            try {
                const item = this.buffer[bufferIndex];
                if (item._type === 'RETURNING_ID') {
                    try {
                        // Here we want to await the callback result to make sure that it has registered the id returned
                        // by the callback before executing the callback needing this id.
                        // eslint-disable-next-line no-await-in-loop
                        const callbackId = await item.callback();
                        this.idTable[item.returnedBufferId] = callbackId;
                    } catch (error) {
                        InternalLog.log(
                            `Error running a callback returning an id in Buffer: ${error}`,
                            SdkVerbosity.WARN
                        );
                    }
                    continue;
                }

                if (item._type === 'WITH_ID') {
                    const callbackId = this.idTable[item.withBufferId];
                    // callbackId can be `null` if the callback supposed to return the id errored. In this case, let's ignore the next callback.
                    if (callbackId !== null && callbackId !== undefined) {
                        item.callback(callbackId);
                        delete this.idTable[item.withBufferId];
                    } else {
                        InternalLog.log(
                            `1 event was not sent as callback id was ${
                                callbackId === null
                                    ? 'not set'
                                    : 'already unset'
                            }`,
                            SdkVerbosity.WARN
                        );
                    }
                    continue;
                }

                item.callback();
            } catch (error) {
                InternalLog.log(
                    `Error while draining Datadog Buffer: ${error}`,
                    SdkVerbosity.WARN
                );
            }
        }

        this.buffer = [];

        this.drainTelemetry();
    };

    private logBufferOverflow() {
        this.addTelemetryEvent('Buffer overflow', '', 'BufferOverflow');
    }

    private logRandomIdGenerationError = (error: any): void => {
        this.addTelemetryEvent(
            'Could not generate enough random numbers',
            getErrorStackTrace(error),
            'RandomIdGenerationError'
        );

        // Not using InternalLog here as it is not yet instantiated
        console.warn(
            `[Datadog] Could not generate enough random numbers for RUM buffer. Please check that Math.random is not overwritten. Math.random returns: ${Math.random()}`
        );
    };

    private generateRandomBufferId = (): string => {
        let tries = 0;
        while (tries < 20) {
            const hash = Math.random().toString(36).slice(2);
            if (this.idTable[hash] !== undefined) {
                tries++;
            } else {
                return hash;
            }
        }

        throw new Error('Could not generate random Buffer id');
    };

    private addTelemetryEvent = (
        message: string,
        stack: string,
        kind: string
    ) => {
        if (this.telemetryBuffer[kind]) {
            this.telemetryBuffer[kind].occurrences++;
        } else {
            this.telemetryBuffer[kind] = {
                message,
                stack,
                kind,
                occurrences: 1
            };
        }
    };

    private drainTelemetry = () => {
        Object.values(this.telemetryBuffer).forEach(
            ({ message, stack, kind, occurrences }) => {
                DdSdk.telemetryError(
                    `${message} happened ${occurrences} times.`,
                    stack,
                    kind
                );
            }
        );
    };
}
