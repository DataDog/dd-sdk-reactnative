/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';
import { DdSdk } from '../../foundation';
import { AttributesSingleton } from '../AttributesSingleton/AttributesSingleton';
import type { Attributes } from '../AttributesSingleton/types';
import { UserInfoSingleton } from '../UserInfoSingleton/UserInfoSingleton';
import type { UserInfo } from '../UserInfoSingleton/types';

import { deepClone } from './utils/deepClone';

export type AdditionalEventDataForMapper = {
    userInfo: UserInfo;
    attributes: Attributes;
};

/**
 * Generic class for applying event mappers.
 *
 * Calls params in this order: formatRawEventForMapper, eventMapper, formatMapperEventForNative.
 *
 * @param eventMapper the user-registered event mapper
 * @param formatRawEventForMapper formatter that gets the raw event (from javascript call) and returns the input given to the mapper
 * @param formatMapperEventForNative formatter that gets the ouput of the mapper, and returns the input given to the native SDKs
 * @param formatRawEventForNative called when no event mapper is registered
 */
export class EventMapper<RawEvent, MapperEvent, NativeEvent> {
    private eventMapper?: (event: MapperEvent) => MapperEvent | null;
    private formatRawEventForMapper: (
        event: RawEvent,
        additionalData: AdditionalEventDataForMapper
    ) => MapperEvent;
    private formatMapperEventForNative: (event: MapperEvent) => NativeEvent;
    private formatRawEventForNative: (event: RawEvent) => NativeEvent;

    constructor(
        eventMapper: ((event: MapperEvent) => MapperEvent | null) | undefined,
        formatRawEventForMapper: (
            event: RawEvent,
            additionalData: AdditionalEventDataForMapper
        ) => MapperEvent,
        formatMapperEventForNative: (event: MapperEvent) => NativeEvent,
        formatRawEventForNative: (event: RawEvent) => NativeEvent
    ) {
        this.eventMapper = eventMapper;
        this.formatRawEventForMapper = formatRawEventForMapper;
        this.formatMapperEventForNative = formatMapperEventForNative;
        this.formatRawEventForNative = formatRawEventForNative;
    }

    public applyEventMapper = (rawEvent: RawEvent): NativeEvent | null => {
        if (!this.eventMapper) {
            return this.formatRawEventForNative(rawEvent);
        }

        // formatting
        const userInfo = UserInfoSingleton.getInstance().getUserInfo();
        const attributes = AttributesSingleton.getInstance().getAttributes();
        const initialEvent = this.formatRawEventForMapper(rawEvent, {
            userInfo,
            attributes
        });

        // mapper
        const backupEvent = deepClone(initialEvent);
        try {
            const mappedEvent = this.eventMapper(initialEvent);
            if (!mappedEvent) {
                return null;
            }
            return this.formatMapperEventForNative(mappedEvent);
        } catch (error) {
            InternalLog.log(
                `The event mapper crashed when mapping ${JSON.stringify(
                    backupEvent
                )}: ${error}`,
                SdkVerbosity.WARN
            );
            DdSdk.telemetryDebug('Error while running the event mapper');
            return this.formatMapperEventForNative(backupEvent);
        }
    };
}
