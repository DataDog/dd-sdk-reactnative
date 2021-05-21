/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type EventsInterceptor from './EventsInterceptor'
import { DdRum } from '../../foundation'

export const UNKNOWN_TARGET_NAME = "unknown_target"
const DEBOUNCE_EVENT_THRESHOLD_IN_MS = 10
const HANDLE_EVENT_APP_EXECUTION_TIME_IN_MS = 1

export class DdEventsInterceptor implements EventsInterceptor {

    private debouncingStartedTimestamp = Number.MIN_VALUE

    interceptOnPress(...args: any[]): void {
        if (args.length > 0 && args[0].length > 0 && args[0][0]._targetInst) {
            const currentTime = Date.now()
            const timestampDifference = Math.abs(Date.now() - this.debouncingStartedTimestamp)
            if (timestampDifference > DEBOUNCE_EVENT_THRESHOLD_IN_MS) {
                const targetProperties = args[0][0]._targetInst
                this.handleTargetEvent(targetProperties)
                // we add an approximated 1 millisecond for the execution time of the `handleTargetEvent` function
                this.debouncingStartedTimestamp = currentTime + HANDLE_EVENT_APP_EXECUTION_TIME_IN_MS
            }
        }
    }

    private handleTargetEvent(targetProperties: any | null) {
        if (targetProperties) {
            const resolvedTargetName = this.resolveTargetName(targetProperties);
            DdRum.addAction(RumActionType.TAP.valueOf(), resolvedTargetName, Date.now(), {})
        }
    }

    private resolveTargetName(targetProperties: any): string {
        const accessibilityLabel = targetProperties.memoizedProps?.accessibilityLabel
        const elementType = targetProperties.elementType
        return accessibilityLabel ? accessibilityLabel : (elementType ? elementType : UNKNOWN_TARGET_NAME)
    }
}

/**
 * Describe the type of a RUM Action.
 */
export enum RumActionType {
    /** User tapped on a widget. */
    TAP = "TAP",
    /** User scrolled a view. */
    SCROLL = "SCROLL",
    /** User swiped on a view. */
    SWIPE = "SWIPE",
    /** User clicked on a widget (not used on Mobile). */
    CLICK = "CLICK",
    /** A custom action. */
    CUSTOM = "CUSTOM"
}
