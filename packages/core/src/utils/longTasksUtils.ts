/**
 * 100ms is the lower bound for a noticeable long task event.
 */
const MIN_LONG_TASK_THRESHOLD_MS = 100;

/**
 * 5000ms is considered an Application Not Responding (ANR) event.
 */
const MAX_LONG_TASK_THRESHOLD_MS = 5000;

/**
 * Makes sure the long task threshold value is above 100 and below 5000.
 * Also makes sure it is a number, passing `0` if it is `false`, as the React Native
 * bridge cannot handle values with dual types.
 */
export const adaptLongTaskThreshold = (
    longTaskThreshold: number | false
): number => {
    if (!longTaskThreshold) {
        return 0;
    }
    if (longTaskThreshold < MIN_LONG_TASK_THRESHOLD_MS) {
        return MIN_LONG_TASK_THRESHOLD_MS;
    }
    if (longTaskThreshold > MAX_LONG_TASK_THRESHOLD_MS) {
        return MAX_LONG_TASK_THRESHOLD_MS;
    }

    return longTaskThreshold;
};
