/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../InternalLog';
import { SdkVerbosity } from '../../../SdkVerbosity';
import DdNativeRum from '../../../specs/NativeDdRum';
import DdSdk from '../../../specs/NativeDdSdk';
import { getBabelTelemetryConfig } from '../../../utils/telemetry';
import { DefaultTimeProvider } from '../../../utils/time-provider/DefaultTimeProvider';
import type { TimeProvider } from '../../../utils/time-provider/TimeProvider';
import { BABEL_PLUGIN_TELEMETRY } from '../../constants';
import type { RumActionType } from '../../types';
import { ActionSource } from '../../types';

const StateErrors = {
    ALREADY_INITIALIZED:
        'Interaction Tracking singleton already initialized, please use `getInstance`.'
} as const;

type BabelConfig = {
    trackInteractions: boolean;
    useAccessibilityLabel: boolean;
};

type TargetObject = {
    getContent: (() => string | null) | undefined;
    handlerParams: any[];
    compoenentName: string;
    'dd-action-name': string[];
    accessibilityLabel: string[];
    [key: string]: any;
};

export class DdBabelInteractionTracking {
    private static instance: DdBabelInteractionTracking | null = null;

    static config: BabelConfig = {
        trackInteractions: false,
        useAccessibilityLabel: true
    };

    private timeProvider: TimeProvider = new DefaultTimeProvider();

    private telemetrySent: boolean = false;

    isInitialized: boolean = false;

    private constructor() {
        if (DdBabelInteractionTracking.instance) {
            throw new Error(StateErrors.ALREADY_INITIALIZED);
        }

        DdBabelInteractionTracking.instance = this;
    }

    static getInstance() {
        if (!DdBabelInteractionTracking.instance) {
            DdBabelInteractionTracking.instance = new DdBabelInteractionTracking();
        }

        return DdBabelInteractionTracking.instance;
    }

    private getTargetName(targetObject: TargetObject) {
        const {
            getContent,
            handlerParams,
            componentName,
            'dd-action-name': actionName,
            accessibilityLabel,
            ...attrs
        } = targetObject;

        const { useAccessibilityLabel } = DdBabelInteractionTracking.config;

        // TODO: This now needs to return an array, but should also account for nested Text Elements
        // TODO: Account for: return `${componentName}(${content})`; given plugin option
        // TODO: only check for handlerParams if component type is 'compound'
        // TODO: Rename handlerParams
        // TODO: Test with internationalization libraries
        // TODO: Add new plugin options: components.useContent, components.prefixName
        // TODO: Add new plugin options: components.tracked[0].contentProp, components.tracked[0].useContent
        // TODO: Fix unit test
        // TODO: Test with different types of CompoundComponents

        const content = getContent?.();

        console.log('Content: ', content);

        console.log('HandlerParams: ', handlerParams);
        const index = handlerParams
            ? handlerParams.find(x => typeof x === 'number') || 0
            : 0;

        // if (content) {
        //     // return `${componentName}(${content})`;
        //     return content;
        // }

        if (actionName) {
            return actionName[index];
        }

        const keys = Object.keys(attrs);
        if (keys.length) {
            // return attrs[keys[0]];
            return attrs[keys[0]][index]; // TODO: this may be wrong
        }

        if (useAccessibilityLabel && accessibilityLabel) {
            return accessibilityLabel[index];
        }

        return componentName;
    }

    wrapRumAction(
        func: (...args: any[]) => any,
        action: RumActionType,
        targetObject: TargetObject
    ): (...args: any[]) => any {
        return (...args: any[]) => {
            const result = func(...args);

            if (!this.telemetrySent) {
                DdSdk?.sendTelemetryLog(
                    BABEL_PLUGIN_TELEMETRY,
                    getBabelTelemetryConfig(),
                    { onlyOnce: true }
                );

                this.telemetrySent = true;
            }

            const targetName = this.getTargetName(targetObject);

            const { trackInteractions } = DdBabelInteractionTracking.config;

            if (trackInteractions) {
                InternalLog.log(
                    `Adding RUM Action “${targetName}” (${action}, auto)`,
                    SdkVerbosity.DEBUG
                );

                DdNativeRum?.addAction(
                    action,
                    targetName,
                    { '__dd.action_source': ActionSource.BABEL },
                    this.timeProvider.now()
                );
            }

            return result;
        };
    }
}
