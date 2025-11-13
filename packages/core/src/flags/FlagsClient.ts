/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { DdNativeFlagsType } from '../nativeModulesTypes';

import type { EvaluationContext } from './types';

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

    getBooleanValue = async (
        key: string,
        defaultValue: boolean
    ): Promise<boolean> => {
        const value = await this.nativeFlags.getBooleanValue(
            this.clientName,
            key,
            defaultValue
        );
        return value;
    };

    getStringValue = async (
        key: string,
        defaultValue: string
    ): Promise<string> => {
        const value = await this.nativeFlags.getStringValue(
            this.clientName,
            key,
            defaultValue
        );
        return value;
    };

    getNumberValue = async (
        key: string,
        defaultValue: number
    ): Promise<number> => {
        const value = await this.nativeFlags.getNumberValue(
            this.clientName,
            key,
            defaultValue
        );
        return value;
    };

    getObjectValue = async (
        key: string,
        defaultValue: { [key: string]: unknown }
    ): Promise<{ [key: string]: unknown }> => {
        // FIXME: This is broken at the moment due to issues with JSON parsing on native iOS SDK side.
        const value = await this.nativeFlags.getObjectValue(
            this.clientName,
            key,
            defaultValue
        );
        return value;
    };
}
