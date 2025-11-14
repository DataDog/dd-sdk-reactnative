/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

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

        await this.nativeFlags.setEvaluationContext(
            this.clientName,
            targetingKey,
            attributes
        );
    };

    getBooleanDetails = async (
        key: string,
        defaultValue: boolean
    ): Promise<FlagDetails<boolean>> => {
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
        // FIXME: This is broken at the moment due to issues with JSON parsing on native iOS SDK side.
        const details = await this.getObjectDetails(key, defaultValue);
        return details.value;
    };
}
