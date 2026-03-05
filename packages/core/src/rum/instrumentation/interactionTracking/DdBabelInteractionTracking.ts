/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import DdSdk from '../../../specs/NativeDdSdk';
import { getGlobalInstance } from '../../../utils/singletonUtils';
import { DefaultTimeProvider } from '../../../utils/time-provider/DefaultTimeProvider';
import type { TimeProvider } from '../../../utils/time-provider/TimeProvider';
import type { DdRum } from '../../DdRum';
import { BABEL_PLUGIN_TELEMETRY } from '../../constants';
import type { RumActionType } from '../../types';
import { ActionSource } from '../../types';

const BABEL_INTERACTION_TRACKING_MODULE =
    'com.datadog.reactnative.rum.babel_interaction_tracking';

type BabelConfig = {
    trackInteractions: boolean;
    useAccessibilityLabel: boolean;
};

type TargetObject = {
    getContent: (() => string[]) | undefined;
    options: { useContent: boolean; useNamePrefix: boolean };
    handlerArgs: any[];
    componentName: string;
    'dd-action-name': string[];
    accessibilityLabel: string[];
    [key: string]: any;
};

class BabelInteractionTracking {
    config: BabelConfig = {
        trackInteractions: false,
        useAccessibilityLabel: true
    };

    private timeProvider: TimeProvider = new DefaultTimeProvider();

    private telemetrySent: boolean = false;

    private ddRum: typeof DdRum | null = null;

    isInitialized: boolean = false;

    getInstance() {
        return DdBabelInteractionTracking;
    }

    attachRumInstance(ddRum: typeof DdRum) {
        this.ddRum = ddRum;
        this.isInitialized = true;
    }

    getTelemetryConfig() {
        return {
            babel_plugin: {
                enabled: !!globalThis.__DD_RN_BABEL_PLUGIN_ENABLED__,
                track_interactions: !!this.config.trackInteractions
            }
        };
    }

    private getTargetName(targetObject: TargetObject) {
        const {
            getContent,
            options,
            handlerArgs,
            componentName,
            'dd-action-name': actionName,
            accessibilityLabel,
            ...attrs
        } = targetObject;

        const { useAccessibilityLabel } = this.config;

        const tryContent = () => {
            const content = getContent?.();
            if (content && content.length > 0) {
                return content;
            }

            return null;
        };

        const getAccessibilityLabel = () =>
            useAccessibilityLabel && accessibilityLabel
                ? accessibilityLabel
                : null;

        const index = handlerArgs
            ? handlerArgs.find(x => typeof x === 'number') || 0
            : 0;

        // Order: actionName → actionNameAttribute → accessibilityLabel → content
        const selectedContent =
            actionName ||
            Object.values(attrs)[0] ||
            getAccessibilityLabel() ||
            tryContent();

        if (!selectedContent) {
            return componentName;
        }

        // Fail-safe in case the our 'index' value turns out to not be a real index
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
            if (!this.telemetrySent) {
                DdSdk?.sendTelemetryLog(
                    BABEL_PLUGIN_TELEMETRY,
                    this.getTelemetryConfig(),
                    { onlyOnce: true }
                );

                this.telemetrySent = true;
            }

            const targetName = this.getTargetName(targetObject);

            const { trackInteractions } = this.config;

            if (trackInteractions) {
                this.ddRum
                    ?.addAction(
                        action,
                        targetName,
                        { '__dd.action_source': ActionSource.BABEL },
                        this.timeProvider.now()
                    )
                    .catch(e => {
                        if (e instanceof Error) {
                            DdSdk?.telemetryError(
                                e.message,
                                e.stack || '',
                                'BabelActionTrack'
                            );
                        }
                    });
            }

            return func(...args);
        };
    }
}

export const DdBabelInteractionTracking = getGlobalInstance(
    BABEL_INTERACTION_TRACKING_MODULE,
    () => new BabelInteractionTracking()
);
