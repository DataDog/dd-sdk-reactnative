import DdNativeRum from '../../../specs/NativeDdRum';
import { DefaultTimeProvider } from '../../../utils/time-provider/DefaultTimeProvider';
import type { TimeProvider } from '../../../utils/time-provider/TimeProvider';
import type { RumActionType } from '../../types';

const StateErrors = {
    ALREADY_INITIALIZED:
        'Interaction Tracking singleton already initialized, please use `getInstance`.'
} as const;

export class DdBabelInteractionTracking {
    private static instance: DdBabelInteractionTracking | null = null;

    static trackInteractions: boolean | null = null;

    private timeProvider: TimeProvider = new DefaultTimeProvider();

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

    wrapRumAction(
        func: (...args: any[]) => any,
        action: RumActionType,
        targetName: string
    ): (...args: any[]) => any {
        return (...args: any[]) => {
            const result = func(...args);

            if (DdBabelInteractionTracking.trackInteractions) {
                DdNativeRum?.addAction(
                    action,
                    targetName,
                    {},
                    this.timeProvider.now()
                );
            }

            return result;
        };
    }
}
