import type { Timestamp } from '../../utils/time-provider/TimeProvider';
import { TimeProvider } from '../../utils/time-provider/TimeProvider';

export default class MockTimeProvider extends TimeProvider {
    unixMockedTime: number;
    reactNativeMockedTime: number | null;

    constructor(unixMockedTime: number, reactNativeMockedTime: number | null) {
        super();
        this.unixMockedTime = unixMockedTime;
        this.reactNativeMockedTime = reactNativeMockedTime;
    }

    getTimestamp(): Timestamp {
        return {
            unix: this.unixMockedTime,
            reactNative: this.reactNativeMockedTime
        };
    }
}
