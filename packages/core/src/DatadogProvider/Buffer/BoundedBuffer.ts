/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';

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

    constructor(bufferSize: number = DEFAULT_BUFFER_SIZE) {
        super();
        this.bufferSize = bufferSize;
    }

    addCallback = (callback: () => Promise<void>) => {
        if (this.buffer.length < this.bufferSize) {
            this.buffer.push({ callback, _type: 'VOID' });
        }

        return new Promise<void>(resolve => resolve(undefined));
    };

    addCallbackReturningId = (callback: () => Promise<string>) => {
        const bufferId = this.generateRandomBufferId();
        if (this.buffer.length < this.bufferSize) {
            this.buffer.push({
                callback,
                returnedBufferId: bufferId,
                _type: 'RETURNING_ID'
            });
            this.idTable[bufferId] = null;
        }

        return new Promise<string>(resolve => resolve(bufferId));
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
                    // Here we want to await the callback result to make sure that it has registered the id returned
                    // by the callback before executing the callback needing this id.
                    // eslint-disable-next-line no-await-in-loop
                    const callbackId = await item.callback();
                    this.idTable[item.returnedBufferId] = callbackId;
                    continue;
                }

                if (item._type === 'WITH_ID') {
                    const callbackId = this.idTable[item.withBufferId];
                    // callbackId can be `null` if the callback supposed to return the id errored. In this case, let's ignore the next callback.
                    if (callbackId !== null && callbackId !== undefined) {
                        item.callback(callbackId);
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
    };

    /**
     * TODO: make this function less dangerous
     * -> limit number of recusions
     * -> can `Math.random().toString(36).slice(2)` fail?
     */
    private generateRandomBufferId = (): string => {
        const hash = Math.random().toString(36).slice(2);
        if (this.idTable[hash] !== undefined) {
            return this.generateRandomBufferId();
        }

        return hash;
    };
}
