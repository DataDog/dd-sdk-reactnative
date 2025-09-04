/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';

export class DdSdkInternalNativeBridgeEvent<DataType> {
    public readonly eventName: string;
    public readonly callback: (data: DataType) => void;

    constructor(eventName: string, callback: (data: DataType) => void) {
        this.eventName = eventName;
        this.callback = (data: DataType) => {
            if (!data) {
                InternalLog.log(
                    `BridgeEvent undefined data for '${eventName}' event: ${
                        data ? JSON.stringify(data) : 'undefined'
                    }`,
                    SdkVerbosity.DEBUG
                );
                return;
            }

            InternalLog.log(
                `BridgeEvent received data for '${eventName}' event: ${
                    data ? JSON.stringify(data) : 'undefined'
                }`,
                SdkVerbosity.DEBUG
            );

            callback(data);
        };
    }
}
