import { TimeProvider } from './TimeProvider';
import type { Timestamp } from './TimeProvider';

export class DefaultTimeProvider extends TimeProvider {
    private canUsePerformanceNow =
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        global.performance && typeof performance.now === 'function';

    getTimestamp(): Timestamp {
        return {
            unix: Date.now(),
            reactNative: this.performanceNow()
        };
    }

    private performanceNow(): number | null {
        if (this.canUsePerformanceNow) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return performance.now();
        }
        return null;
    }
}
