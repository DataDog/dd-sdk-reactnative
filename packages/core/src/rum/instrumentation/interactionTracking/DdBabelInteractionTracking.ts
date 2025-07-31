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
    compoenentName: string;
    'dd-action-name': string;
    accessibilityLabel: string;
    [key: string]: string;
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
            componentName,
            'dd-action-name': actionName,
            accessibilityLabel,
            ...attrs
        } = targetObject;

        const { useAccessibilityLabel } = DdBabelInteractionTracking.config;

        if (actionName) {
            return actionName;
        }

        const keys = Object.keys(attrs);
        if (keys.length) {
            return attrs[keys[0]];
        }

        if (useAccessibilityLabel && accessibilityLabel) {
            return accessibilityLabel;
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
