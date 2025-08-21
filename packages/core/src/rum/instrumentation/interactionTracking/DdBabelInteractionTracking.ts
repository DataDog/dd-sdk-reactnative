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
    getContent: (() => string[]) | undefined;
    options: { useContent: boolean; useNamePrefix: boolean };
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
            options,
            handlerParams,
            componentName,
            'dd-action-name': actionName,
            accessibilityLabel,
            ...attrs
        } = targetObject;

        const { useAccessibilityLabel } = DdBabelInteractionTracking.config;
        let selectedContent: string[] | null = null;

        // Test with rendered ternary operations - OK
        // Test with internationalization libraries - OK
        // Only set HandlerParams if it is a compound component ?? We could only send arguments that are numbers and this way prevent the use of type === 'compound'

        // TODO: test with black plugin configuration to ensure defaults work
        // TODO: add contentProp
        // TODO: Rename handlerParams
        // TODO: Fix unit test
        // TODO: Test with different types of CompoundComponents

        const content = getContent?.();

        const index = handlerParams
            ? handlerParams.find(x => typeof x === 'number') || 0
            : 0;

        if (content && content.length) {
            selectedContent = content;
        }

        if (actionName) {
            selectedContent = actionName;
        }

        const keys = Object.keys(attrs);
        if (keys.length) {
            const actionNameAttr = attrs[keys[0]];
            selectedContent = actionNameAttr;
        }

        if (useAccessibilityLabel && accessibilityLabel) {
            selectedContent = accessibilityLabel;
        }

        if (!selectedContent) {
            return componentName;
        }

        // Failsafe in case the our 'index' value turns out to not be a real index
        const output =
            index + 1 > selectedContent.length || index < 0
                ? selectedContent[0]
                : selectedContent[index];

        return options.useNamePrefix
            ? `${componentName} ("${output}")`
            : output;
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
