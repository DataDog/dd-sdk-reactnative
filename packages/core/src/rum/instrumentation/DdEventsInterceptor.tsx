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
const DD_ACTION_NAME_PROP = "dd-action-name"

export class DdEventsInterceptor implements EventsInterceptor {

    private debouncingStartedTimestamp = Number.MIN_VALUE

    interceptOnPress(...args: any[]): void {
        if (args.length > 0 && args[0] && args[0]._targetInst) {
            const currentTime = Date.now()
            const timestampDifference = Math.abs(Date.now() - this.debouncingStartedTimestamp)
            if (timestampDifference > DEBOUNCE_EVENT_THRESHOLD_IN_MS) {
                const targetNode = args[0]._targetInst
                this.handleTargetEvent(targetNode)
                // we add an approximated 1 millisecond for the execution time of the `handleTargetEvent` function
                this.debouncingStartedTimestamp = currentTime + HANDLE_EVENT_APP_EXECUTION_TIME_IN_MS
            }
        }
    }

    private handleTargetEvent(targetNode: any | null) {
        if (targetNode) {
            const resolvedTargetName = this.resolveTargetName(targetNode);
            DdRum.addAction(RumActionType.TAP.valueOf(), resolvedTargetName)
        }
    }

    private resolveTargetName(targetNode: any): string {
        const closestActionLabel = this.findClosestActionLabel(targetNode)
        if (closestActionLabel != null) {
            return closestActionLabel
        }
        const accessibilityLabel = targetNode.memoizedProps?.accessibilityLabel
        if (accessibilityLabel != null) {
            return accessibilityLabel
        }
        const elementTypeName = this.resolveElementTypeName(targetNode.elementType)
        return elementTypeName ? elementTypeName : UNKNOWN_TARGET_NAME
    }

    private resolveElementTypeName(elementType: any): string | null {
        let elementTypeName = null
        if (typeof elementType === "string") {
            elementTypeName = elementType
        } else if (elementType && typeof elementType.name === "string") {
            elementTypeName = elementType.name
        }
        return elementTypeName
    }

    private findClosestActionLabel(targetNode: any): string | null {
        let currentNode = targetNode
        while (currentNode) {
            const props = currentNode.memoizedProps
            if (props && props[DD_ACTION_NAME_PROP]) {
                return props[DD_ACTION_NAME_PROP]
            }
            currentNode = currentNode.return
        }
        return null
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
