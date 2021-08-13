type Timestamp = {
    // Result of Date API. Unix timestamp in ms.
    unix: number,
    // Result of performance.now API. Timestamp in ms (with microsecond precision)
    // since JS context start.
    react_native: number | null
}

const START_LABEL = "__start"
const STOP_LABEL = "__stop"

/**
 * Simple timer which records time ticks. Shouldn't be re-used once stopped.
 * All timestamps/durations returned are in milliseconds.
 */
export default class Timer {

    private times: Record<string, Timestamp> = {};

    get startTime(): number {
        return this.times[START_LABEL].unix
    }

    get stopTime(): number {
        return this.startTime + this.durationBetween(START_LABEL, STOP_LABEL)
    }

    start(): void {
        this.recordTick(START_LABEL);
    }

    stop(): void {
        this.recordTick(STOP_LABEL)
    }

    recordTick(label: string): void {
        this.times[label] = {
            unix: Date.now(),
            react_native: this.performanceNow()
        }
    }

    hasTickFor(label: string): boolean {
        return label in this.times;
    }

    durationBetween(startLabel: string, endLabel: string): number {
        this.checkLabelExists(startLabel);
        this.checkLabelExists(endLabel);

        const startTick = this.times[startLabel];
        const endTick = this.times[endLabel];

        return this.durationBetweenTicks(startTick, endTick);
    }

    timeAt(label: string): number {
        this.checkLabelExists(label);

        return this.startTime + this.durationBetween(START_LABEL, label)
    }

    reset(): void {
        this.times = {};
    }

    private durationBetweenTicks(start: Timestamp, end: Timestamp): number {
        if (start.react_native != null && end.react_native != null) {
            return end.react_native - start.react_native;
        }
        return end.unix - start.unix;
    }


    private performanceNow(): number | null {
        if (this.canUsePerformanceNow()) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return performance.now();
        }
        return null;
    }

    private canUsePerformanceNow(): boolean {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return global.performance && typeof performance.now === 'function';
    }

    private checkLabelExists(label: string) {
        if (!this.hasTickFor(label)) {
            throw new Error(`Label ${label} is not registered`);
        }
    }

}
