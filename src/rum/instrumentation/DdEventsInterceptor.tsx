import type EventsInterceptor from './EventsInterceptor'
import { DdRum } from '../../index'

export const UNKNOWN_TARGET_NAME = "unknown_arget"
const DEBOUNCE_EVENT_THRESHOLD_IN_MS = 10;

export class DdEventsInterceptor implements EventsInterceptor {

    private debouncingStartedTimestamp = Number.MIN_VALUE

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interceptOnPress(...args: any[]): void {
        if (args.length > 0 && args[0].length > 0 && args[0][0]._targetInst) {
            const timestampDifference = Math.abs(new Date().getTime() - this.debouncingStartedTimestamp);
            if (timestampDifference > DEBOUNCE_EVENT_THRESHOLD_IN_MS) {
                const targetProperties = args[0][0]._targetInst
                this.handleTargetEvent(targetProperties)
                this.debouncingStartedTimestamp = new Date().getTime()
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private handleTargetEvent(targetProperties: any | null) {
        if (targetProperties) {
            const resolvedTargetName = this.resolveTargetName(targetProperties);
            DdRum.addAction(RumActionType.TAP.valueOf(), resolvedTargetName, new Date().getTime(), {})
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
