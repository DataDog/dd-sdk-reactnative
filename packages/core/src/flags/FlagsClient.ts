/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';
import type { DdNativeFlagsType } from '../nativeModulesTypes';

import type { EvaluationContext, FlagDetails } from './types';

export class FlagsClient {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeFlags: DdNativeFlagsType = require('../specs/NativeDdFlags')
        .default;

    private clientName: string;

    constructor(clientName: string = 'default') {
        this.clientName = clientName;
    }

    setEvaluationContext = async (
        context: EvaluationContext
    ): Promise<void> => {
        const { targetingKey, attributes } = context;

        try {
            await this.nativeFlags.setEvaluationContext(
                this.clientName,
                targetingKey,
                attributes
            );
        } catch (error) {
            if (error instanceof Error) {
                InternalLog.log(
                    `Error setting flag evaluation context: ${error.message}`,
                    SdkVerbosity.ERROR
                );
            }
        }
    };

    getBooleanDetails = async (
        key: string,
        defaultValue: boolean
    ): Promise<FlagDetails<boolean>> => {
        if (typeof defaultValue !== 'boolean') {
            return {
                key,
                value: defaultValue,
                variant: null,
                reason: null,
                error: 'TYPE_MISMATCH'
            };
        }

        const details = await this.nativeFlags.getBooleanDetails(
            this.clientName,
            key,
            defaultValue
        );
        return details;
    };

    getStringDetails = async (
        key: string,
        defaultValue: string
    ): Promise<FlagDetails<string>> => {
        if (typeof defaultValue !== 'string') {
            return {
                key,
                value: defaultValue,
                variant: null,
                reason: null,
                error: 'TYPE_MISMATCH'
            };
        }

        const details = await this.nativeFlags.getStringDetails(
            this.clientName,
            key,
            defaultValue
        );
        return details;
    };

    getNumberDetails = async (
        key: string,
        defaultValue: number
    ): Promise<FlagDetails<number>> => {
        if (typeof defaultValue !== 'number') {
            return {
                key,
                value: defaultValue,
                variant: null,
                reason: null,
                error: 'TYPE_MISMATCH'
            };
        }

        const details = await this.nativeFlags.getNumberDetails(
            this.clientName,
            key,
            defaultValue
        );
        return details;
    };

    getObjectDetails = async (
        key: string,
        defaultValue: { [key: string]: unknown }
    ): Promise<FlagDetails<{ [key: string]: unknown }>> => {
        if (typeof defaultValue !== 'object' || defaultValue === null) {
            return {
                key,
                value: defaultValue,
                variant: null,
                reason: null,
                error: 'TYPE_MISMATCH'
            };
        }

        const details = await this.nativeFlags.getObjectDetails(
            this.clientName,
            key,
            defaultValue
        );
        return details;
    };

    getBooleanValue = async (
        key: string,
        defaultValue: boolean
    ): Promise<boolean> => {
        const details = await this.getBooleanDetails(key, defaultValue);
        return details.value;
    };

    getStringValue = async (
        key: string,
        defaultValue: string
    ): Promise<string> => {
        const details = await this.getStringDetails(key, defaultValue);
        return details.value;
    };

    getNumberValue = async (
        key: string,
        defaultValue: number
    ): Promise<number> => {
        const details = await this.getNumberDetails(key, defaultValue);
        return details.value;
    };

    getObjectValue = async (
        key: string,
        defaultValue: { [key: string]: unknown }
    ): Promise<{ [key: string]: unknown }> => {
        const details = await this.getObjectDetails(key, defaultValue);
        return details.value;
    };
}
